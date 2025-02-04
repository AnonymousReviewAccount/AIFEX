
import BrowserService from "../domain/BrowserService";
import { getWindowById, updateWindowById, createWindow, getCurrentWindow, removeWindowById, executeTabScript, removeTabs, createTab, takeScreenshot, captureStreamOnWindow, focusTab } from "./FirefoxPromise";
import WindowOption from "./WindowOption";
import {logger} from "../framework/Logger";

const DEFAULT_WINDOW_OPTIONS = {url:'https://www.aifex.fr'};
const DEFAULT_TAB_OPTIONS = {};

export default class FirefoxBrowserService implements BrowserService {

    recorder : MediaRecorder | undefined;
    stream : MediaStream | undefined;
    recordedChunks : Blob[];

    constructor() {
        this.recorder = undefined;
        this.stream = undefined;
        this.recordedChunks = [];
    }


    get aifexPopupActivatedUrl(): string {
        return browser.runtime.getURL("/aifex_page/index.html");
    }

    get aifexPopupDeactivatedPage(): string {
        return chrome.runtime.getURL("/aifex_page/deactivated.html");
    }

    getExtensionVesion(): string {
        return browser.runtime.getManifest().version
    }

    createWindow(url?:string): Promise<number> {
        const options = Object.assign(DEFAULT_WINDOW_OPTIONS, {url});
        const windowOption = new WindowOption(options);
        return createWindow(windowOption)
            .then( window => {
                if (window && window.id) {
                    return window.id;
                } else {
                    return Promise.reject(`cannot create window`);
                }
            })
    }

    createTab(windowId: number, url?: string): Promise<number | undefined> {
        const options =  Object.assign(DEFAULT_TAB_OPTIONS, {windowId, url});
        return createTab(options)
        .then((tab: browser.tabs.Tab) => {
            return tab.id;
        });
    }

    getTabIdListOfWindow(windowId: number): Promise<number[]> {
        return browser.windows.get(windowId, {populate: true})
        .then((window) => {
            if (window && window.tabs) {
                return window.tabs.map(tab => tab.id).filter((id : number | undefined): id is number => id !== undefined);
            } else {
                console.error("Cannot find window")
                return [];
            }
        })
    }

    getCurrentWindow(): Promise<{windowId:number, tabsId?:number[]}> {
        return getCurrentWindow()
        .then( (window) => {
            if (window && window.id) {
                let windowId : number = window.id;
                let tabsId : number[] | undefined;
                if (window.tabs) {
                    tabsId =  window.tabs?.map(tab => tab.id).filter((id : number | undefined): id is number => id !== undefined);
                }                
                return {
                    windowId,
                    tabsId                
                }
            } else {
                return Promise.reject(`no current window`);
            }
        })
    }

    focusTab(tabId: number): Promise<void> {
        return focusTab(tabId);
    }

    drawAttentionToWindow(windowId: number): Promise<void> {
        return getWindowById(windowId)
            .then( _window => {
                return updateWindowById(windowId, {drawAttention: true,focused: true});
            })
    }


    closeWindow(windowId: number):Promise<void> {
        return removeWindowById(windowId);
    }

    closeTab(tabId: number): Promise<void> {
        throw removeTabs([tabId]);
    }

    runScript(tabId: number): Promise<boolean> {
        return executeTabScript(tabId)
    }

    restartWindow(windowId: number, url?: string): Promise<void> {
        let tabIds : number[];
        return getWindowById(windowId)
            .then((window) => {
                return window.tabs
            })
            .then((tabs) => {
                if (tabs) {
                    tabIds = tabs.map(tab=>tab.id).filter( (id : number | undefined) : id is number => id !== undefined);
                    return createTab({windowId, index:0, url});
                }
            })
            .then(() => {
                return removeTabs(tabIds);
            })
    }


    takeScreenshot(windowId : number): Promise<string> {
        return takeScreenshot(windowId);
    }


    captureStreamOnWindow(): Promise<{stream:MediaStream, id: number}> {
        return captureStreamOnWindow();
    }

    hideCapture(id: number) : void {
        logger.warn("Not implemented hide capture")
    }

    setPopupToDetached(): void {
        browser.browserAction.setPopup({popup: this.aifexPopupDeactivatedPage})
    }

    setPopupToAttached(): void {
        browser.browserAction.setPopup({popup: this.aifexPopupActivatedUrl})
    }

    attachBrowserActionClicked( handler : (windowId:number) => void): void {
        browser.browserAction.onClicked.addListener((tab) => {
            if (tab.id) {
                handler(tab.id);
            }
        });
    }

    attachWindowCreatedHandler( handler : (windowId:number) => void) : void{
        browser.windows.onCreated.addListener((window) => {
            if (window.id) {
                handler(window.id);
            }
        })
    }

    attachWindowRemovedHandler(handler: (windowId: number) => void) : void{
        browser.windows.onRemoved.addListener(handler);
    }

    attachTabCreatedHandler(handler : (tabId:number, windowId:number) => void) : void{
        browser.tabs.onCreated.addListener((tab) => {
            if (tab.id && tab.windowId) {
                handler(tab.id, tab.windowId);
            }
        })
    }

    attachTabRemovedHandler(handler : (tabId:number, windowId:number) => void) : void{
        browser.tabs.onRemoved.addListener( (tabId, removeInfo) => {
            handler(tabId, removeInfo.windowId);
        });
    }

    attachTabDetachedHandler(handler: (tabId: number, windowId: number) => void) : void{
        browser.tabs.onDetached.addListener( (tabId , detachInfo) => {
            handler(tabId, detachInfo.oldWindowId);
        })
    }

    attachTabAttachedHandler(handler: (tabId: number, windowId: number) => void) : void{
        browser.tabs.onAttached.addListener((tabId, attachInfo) => {
            handler(tabId, attachInfo.newWindowId);
        })
    }

    attachTabActivatedHandler(handler: (tabId: number, windowId: number) => void) : void{
        browser.tabs.onActivated.addListener((activeInfo) => {
            handler(activeInfo.tabId, activeInfo.windowId);
        })
    }

    attachOnDomLoadedHandler( handler : (tabId:number) => void) : void {
        browser.webNavigation.onDOMContentLoaded.addListener(details => {
            const NAVIGATION_OCCURS_IN_TOP_FRAME = 0;
            if (details.frameId === NAVIGATION_OCCURS_IN_TOP_FRAME) {
                handler(details.tabId);
            }
        })
    }

    attachOnCommittedHandler( handler : (tabId:number) => void) : void{
        browser.webNavigation.onDOMContentLoaded.addListener(details => {
            const NAVIGATION_OCCURS_IN_TOP_FRAME = 0;
            if (details.frameId === NAVIGATION_OCCURS_IN_TOP_FRAME) {
                handler(details.tabId);
            }
        })
    }

}
