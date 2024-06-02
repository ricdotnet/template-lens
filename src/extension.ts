import { ExtensionContext, commands, TextDocument, window, workspace, Range, languages, TextDocumentChangeEvent, Disposable } from 'vscode';
import { NavigateToTemplate } from './code-lens/navigate-to-template';

import path from 'path';

const codeLensProviders: Map<string, Disposable> = new Map();

export function activate(context: ExtensionContext) {
	console.log('Congratulations, your extension "template-lens" is now active!');
	
	const config = workspace.getConfiguration('template-lens');

	let disposable = commands.registerCommand('template-lens.navigateToTemplate', async (index: number) => {
		const document = window.activeTextEditor?.document;
		const line = document?.lineAt(index);
		
		if (!line) {
			return;
		}
		
		const stringMatcher = /(["'`])(?:(?=(\\?))\2.)*?\1|([a-zA-Z0-9\-_/]+\/[a-zA-Z0-9\-_/]+)/g;
		const matches = line.text.match(stringMatcher);
		
		if (!matches || !matches.length) {
			return;
		}

		const match = matches[0].slice(1, -1);
		const currentDirectory = workspace.workspaceFolders?.[0].uri.fsPath;
		
		if (!currentDirectory) {
			return;
		}
		
		const configTemplatePath = config.get<string>('templatePath');
		if (!configTemplatePath) {
			window.showErrorMessage('Please provide a template path in the configuration!');
			return;
		}
		
		const configFileExtension = config.get<string>('fileExtension');

		let templatePath = path.join(currentDirectory, configTemplatePath, `${match}`);
		if (!templatePath.endsWith(configFileExtension ?? '.html')) {
			templatePath = templatePath.concat(configFileExtension ?? '.html');
		}

		try {
			const document: TextDocument = await workspace.openTextDocument(templatePath);
			await window.showTextDocument(document, { preview: false, preserveFocus: true });
		} catch (err) {
			window.showErrorMessage('Could not find template!', templatePath);
			return;
		}
	});

	workspace.onDidOpenTextDocument((e: TextDocument) => {
		if (e.fileName.includes('.git')) {
			return;
		}
		
		const fileName = e.fileName.split('\\').at(-1);
		const pattern = `**/${fileName}`;

		e.getText().split('\n').forEach(async (line: string, index: number) => {
			if (line.includes('res.render(')) {
				const codeLensProvider = new NavigateToTemplate(new Range(index, 0, index, 0), index);
				const codeLensDisposable = languages.registerCodeLensProvider({ pattern }, codeLensProvider);
				
				context.subscriptions.push(codeLensDisposable);
				
				codeLensProviders.set(e.fileName + line.toString(), codeLensDisposable);
			}
		});
	});
	
	workspace.onDidCloseTextDocument((e: TextDocument) => {
		if (e.fileName.includes('.git')) {
			return;
		}
		
		codeLensProviders.forEach((disposable, key) => {
			if (key.includes(e.fileName)) {
				disposable.dispose();
				codeLensProviders.delete(key);
			}
		});
	});
	
	workspace.onDidChangeTextDocument((e: TextDocumentChangeEvent) => {
		console.log(e.reason);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {
	codeLensProviders.forEach(disposable => disposable.dispose());
	codeLensProviders.clear();
}
