import * as fs from 'fs';
import * as vscode from "vscode";
import { CommitData, ProjectData } from "./types";

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;
    private readonly _context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
        };

        webviewView.webview.html = this.getHtml();

        webviewView.webview.onDidReceiveMessage(message => {
            if (message.type === 'openRepo') {
                vscode.env.openExternal(vscode.Uri.parse(message.url));
            }
            if (message.type === 'openFolder') {
                const uri = vscode.Uri.file(message.path);
                vscode.commands.executeCommand('revealFileInOS', uri);
            }
            if(message.type === 'fetchData') {
                vscode.commands.executeCommand('month.getData');
            }
        });

        this.updateWebview();
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.updateWebview();
            }
        });
    }

    public updateWebview() {
        const oneMonthAgo = new Date(new Date());
        oneMonthAgo.setMonth(new Date().getMonth() - 1);
        const formattedDate = oneMonthAgo.toISOString().split('T')[0];

        if (!this._view) {
            return;
        }

        const commitData: CommitData[] = this._context.globalState.get('commitData') || [];
        const projectData: ProjectData[] = this._context.globalState.get('projectData') || [];

        const filteredProjectData = projectData.filter(project => {
            return project.date >= formattedDate;
        });

        this._context.globalState.update("projectData", filteredProjectData);

        this._view.webview.postMessage({
            type: 'updateCommitData',
            data: commitData
        });

        this._view.webview.postMessage({
            type: 'updateProjectData',
            data: projectData
        });
    }


    private getHtml(): string {
        const filePath = vscode.Uri.joinPath(this._context.extensionUri, 'media', 'index.html').fsPath;
        let html = fs.readFileSync(filePath, 'utf8');
        return html;
    }
}