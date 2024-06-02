import { CodeLensProvider, TextDocument, CodeLens, Range, Command, Event } from "vscode";

export class NavigateToTemplate implements CodeLensProvider {
  private range: Range;
  private index: number;
  
  constructor(range: Range, index: number) {
    this.range = range;
    this.index = index;
  }
  
  async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
    const clc: Command = {
      command: 'template-lens.navigateToTemplate',
      title: 'Navigate to template',
      arguments: [this.index]
    };
    
    const codeLens = new CodeLens(this.range, clc);

    return [codeLens];
  }
}