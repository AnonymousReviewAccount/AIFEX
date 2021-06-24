# WISE 2021 - Crowdsourcing Scenario-Focused Exploratory Testing Sessions

This project contains the code used during our experimentations. This repository contains the source code at the submission of the paper, and a more stable version is probably available in the official AIFEX github repository.

## Results
The **review** folder contains the json files obtained from the test sessions. Each file contains the list of the explorations made by the testers during the crowdsourced testing sessions. 

The detection_rules.txt file contains the detection rules written with our DSL used to parametrize the evaluator module.

## Run results computation
First, you need to start the AIFEX containers by following the README.md instructions, 

Then:

Prerequisites Node.js(^8.10.0, ^10.13.0, or >= 11.10.1), npm version 3+


    npm install
    node index.js


## Contribution to the AIFEX Project
The AIFEX project is based on the Docker technology, you can check our container in the **evaluator** folder. If you want to run the project, we invite you to read the README.md file.
