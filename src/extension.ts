import axios from "axios";
import * as vscode from 'vscode';
import { debounce, getLocalToday } from "./util";
import { CommitData, ProjectData } from "./types";
import { SidebarProvider } from "./SidebarProvider";

export function activate(context: vscode.ExtensionContext) {

	const today = getLocalToday();
	const sidebarProvider = new SidebarProvider(context);

	const saveData = debounce(() => {

		const Folders = vscode.workspace.workspaceFolders?.map((f) => f.uri.fsPath) || [];
        const projectData = context.globalState.get<ProjectData[]>("projectData", []);
		const existingData = projectData.find((data) => data.date === today);
        
		if (existingData) {
			existingData.folders = [...new Set([...existingData.folders, ...Folders])];
		} else {
			projectData.push({
			  date: today,
			  folders: Folders,
			});
		}
		context.globalState.update("projectData", projectData);
	});

	const disposable0 = vscode.workspace.onDidSaveTextDocument(() => {
        saveData();
	});

	const disposable1 = vscode.commands.registerCommand("month.getData", async () => {
		const userQuery = ` query GetUserId {
										viewer {
										id
										login
										}
									}`;
		try {
		  const session = await vscode.authentication.getSession("github", [], { createIfNone: true });
		  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
		  if (session) {
			const userResponse = await axios.post(
				"https://api.github.com/graphql",
				{ query: userQuery },
				{
				  headers: {
					Authorization: `Bearer ${session.accessToken}`,
					"Content-Type": "application/json",
				  },
				}
			);
			const githubId = userResponse.data.data.viewer.id;
			const query = `query GetUserCommitEvents{
							viewer {
							  contributionsCollection {
								commitContributionsByRepository {
								  repository {
									url
									defaultBranchRef {
									  target {
										... on Commit {
										  history(first: 100, author: {id: "${githubId}"}, since: "${firstOfMonth}", after: null) {
											pageInfo {
											  endCursor
											  hasNextPage
											}
											nodes {
											  committedDate
											}
										  }
										}
									  }
									}
								  }
								}
							  }
							}
			}`;
	
			const response = await axios.post(
				"https://api.github.com/graphql",
				{ query },
				{
				  headers: {
					Authorization: `Bearer ${session.accessToken}`,
					"Content-Type": "application/json",
				  },
				}
			);
	  
			const commitsByDate = new Map<string, { repos: Set<string>; }>();
	
			response.data.data.viewer.contributionsCollection.commitContributionsByRepository.forEach(
			  (repo: any) => {
				const repoUrl = repo.repository.url;
				repo.repository.defaultBranchRef.target.history.nodes.forEach((commit: any) => {
				  const date = new Date(commit.committedDate).toLocaleDateString("en-US", {
					timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				  });
	
				  if (!commitsByDate.has(date)) {
					commitsByDate.set(date, { repos: new Set<string>() });
				  }
				  const dateData = commitsByDate.get(date);
				  if (dateData) {
					dateData.repos.add(repoUrl);
				  }
				});
			  }
			);
	
			const commitData: CommitData[] = Array.from(commitsByDate.entries()).map(
			  ([date, data]) => ({
				commit_date: date,
				repos: Array.from(data.repos),
			  })
			);
			context.globalState.update("commitData", commitData);
			  
		  }
		}catch (error: any) {
			vscode.window.showErrorMessage(`Error fetching GitHub data: ${error.message}`);
		  }
	});

	const disposable2 = vscode.window.registerWebviewViewProvider("month.sidePanel", sidebarProvider);

	context.subscriptions.push(disposable0,disposable1,disposable2);
}

export function deactivate() {}
