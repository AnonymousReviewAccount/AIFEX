const fs = require("fs");
const fetch = require('node-fetch');

const expressionFilePath = "./detection_rules.txt";

const sessionEvalNoProbaJSON = "./EvaluatedBluesky.json"
const sessionEvalProbaJSON = "./EvaluatedRainbow.json";
const sessionNoEvalNoProbaJSON = "./Bluesky.json";
const sessionNoEvalProbaJSON = "./Rainbow.json";
const sessionEvalProbaRestict = "./EvaluatedRainbowRestricted.json";

const resultFile = "./results/results.csv";

const expression = fs.readFileSync(expressionFilePath, "utf8");

const sessionEvalNoProba = JSON.parse(fs.readFileSync(sessionEvalNoProbaJSON, "utf-8"));
const sessionEvalProba = JSON.parse(fs.readFileSync(sessionEvalProbaJSON, "utf-8"));
const sessionNoEvalNoProba = JSON.parse(fs.readFileSync(sessionNoEvalNoProbaJSON, "utf-8"));
const sessionNoEvalProba = JSON.parse(fs.readFileSync(sessionNoEvalProbaJSON, "utf-8"));
const sessionEvalProbaRestrict = JSON.parse(fs.readFileSync(sessionEvalProbaRestict, "utf-8"));

let evalNoProba;
let evalProba;
let noEvalNoProba;
let noEvalProba;
let evalProbaRestrict

let nbExploration = 100;
let maxDurationAccepted = 10

const actionsRemoved = ["pictureover"];

evaluateSession(sessionEvalNoProba, expression)
.then(data => {
    evalNoProba = data;
    let last = data[data.length-1];
    console.log(`EvaluatedBluesky valid : ${last[1]}, ngram: ${last[2]}`)
    return evaluateSession(sessionEvalProba, expression)
}).then(data => {
    evalProba = data;
    let last = data[data.length-1];
    console.log(`EvaluatedRainbow valid : ${last[1]}, ngram: ${last[2]}`)
    return evaluateSession(sessionNoEvalNoProba, expression)
}).then(data => {
    noEvalNoProba = data
    let last = data[data.length-1];
    console.log(`Bluesky valid : ${last[1]}, ngram: ${last[2]}`)
    return evaluateSession(sessionNoEvalProba, expression)
}).then(data => {
    noEvalProba = data
    let last = data[data.length-1];
    console.log(`Rainbow valid : ${last[1]}, ngram: ${last[2]}`)
    return evaluateSession(sessionEvalProbaRestrict, expression)
}).then((data) => {
    evalProbaRestrict = data
    let last = data[data.length-1];
    console.log(`Rainbow Restricted valid : ${last[1]}, ngram: ${last[2]}`)

    let csv = ["tasks;valid;ngram;duration;length;assistant"];

    evalNoProba.forEach(res => {
        csv.push([...res, "Evaluated_Bluesky"].join(";").replace(/(\r\n|\n|\r)/gm, ""))
    })
    
    evalProba.forEach(res => {
        csv.push([...res, "Evaluated_Rainbow"].join(";").replace(/(\r\n|\n|\r)/gm, ""))
    })

    noEvalNoProba.forEach(res => {
        csv.push([...res, "Bluesky"].join(";").replace(/(\r\n|\n|\r)/gm, ""))
    })

    noEvalProba.forEach(res => {
        csv.push([...res, "Rainbow"].join(";").replace(/(\r\n|\n|\r)/gm, ""))
    })

    evalProbaRestrict.forEach(res => {
        csv.push([...res, "Evaluated_Rainbow_Resticted"].join(";").replace(/(\r\n|\n|\r)/gm, ""))
    })


    let res = csv.join("\n")
    fs.writeFileSync(resultFile, res)
})

function evaluateSession(session, expression) {

    let explorations = session.explorationList.map(exploration => {
        return exploration.interactionList
        .filter(interaction => interaction.concreteType === "Action")
        .filter(interaction => !actionsRemoved.includes(interaction.kind))
        .map(interaction => {
            if (interaction.value !== undefined) {
                return `${interaction.kind}$${interaction.value}`
            } else {
                return interaction.kind
            }
        })
    });
    let explorationsDurations = session.explorationList.map(exploration => getExplorationDuration(exploration));
    let explorationsLength = session.explorationList.map(exploration => getExplorationLength(exploration));
    let i = 0;
    let filteredExplorations = [];
    while (i < explorations.length && filteredExplorations.length < nbExploration) {
        const nbEnd = explorations[i].reduce((acc, curr) => {
            if (curr === "end") {
                return acc+1;
            } else {
                return acc
            }
        }, 0);
        if (nbEnd === 1) {
            filteredExplorations.push(explorations[i])
        } 
        i++;
    }
    explorations = filteredExplorations

    const evaluationPromises = explorations.map((exploration) => 
        evaluateExploration(expression, exploration)
    )

    return Promise.all(evaluationPromises).then(explorationsValidity => {
        let results = [];
        for (let explorationListSize = 1; explorationListSize <= explorations.length; explorationListSize++) {

            const validExplorations = explorationsValidity
            .slice(0, explorationListSize)
            .filter(explorationWithValidity => explorationWithValidity.validity === true)
            .map(explorationWithValidity => explorationWithValidity.exploration)

            let nbExploration = explorationListSize;
            let nbExplorationValid = validExplorations.length
            let ngramCoveredFromValid = getNgramCount(validExplorations).total;
            let duration = explorationsDurations[explorationListSize-1];
            let length = explorationsLength[explorationListSize-1];
            if (duration < maxDurationAccepted) {
                results.push([nbExploration, nbExplorationValid, ngramCoveredFromValid, duration, length])
            }
        }
        return results;
    })
}

function evaluateExploration(expression, interactionList) {
    const body = {
        expression, 
        interactionList
    }
    return fetch("http://localhost:5010/evaluator/evaluateFromExpression", { 
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(res => {
        if (res.ok) {
            return res.json()
        } else {
            console.error(res.status);
        }
    })
    .then(data => {
        return {
            exploration: interactionList,
            validity: data.isValid
        }
    })
    .catch(error => {
        console.error(error)
    })
}

function getNgramCount(explorationList) {
    const ngrams = {};

    for (let windowSize = 1; windowSize <= 8; windowSize++) {
        ngrams[windowSize] = new Map();
    }
    for (const exploration of explorationList) {
        for (let windowSize = 1; windowSize <= 8; windowSize++) {
            for (let index = 0; index + windowSize <= exploration.length; index++) {
                const actions = exploration.slice(index, index + windowSize);
                const ngram = actions.join(',');
                if (!ngrams[windowSize].has(ngram)) {
                    ngrams[windowSize].set(ngram, 1) 
                } else {
                    ngrams[windowSize].set(ngram, ngrams[windowSize].get(ngram) + 1)
                }
            }
        }
    }
    let total = 0;
    for (let windowSize = 1; windowSize <= 8; windowSize++) {
        ngrams[windowSize] = ngrams[windowSize].size;
        total += ngrams[windowSize];
    }
    ngrams["total"] = total
    return ngrams
}

function getExplorationDuration(exploration) {
    const first = exploration.interactionList[0].date;
    const last = exploration.interactionList[exploration.interactionList.length-1].date;
    return (Date.parse(last) - Date.parse(first)) /60000;

} 

function getExplorationLength(exploration) {
    return exploration.interactionList.length;
}