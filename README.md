# Reflexion Models inside VSCODE

This code is part of a master's thesis project in computer science at ITU on integrating reflexion models in the IDE.  
The repository consists of the source code of a VSCODE extension and the extension (VSIX). The code is a prototype/MVP thus it is not production-ready and currently used for evaluation purposes.

## Quick guide: Installing and using the extension

1. [Download the VSIX file](vscode-reflexion-model-0.1.0.vsix)
2. Open VSCODE -> go to the extension tab -> press the 3 dots in the top right corner -> install from VSIX and select the downloaded file
3. If it is installed correctly -> Open the command prompt and choose "Start Reflexion Webview"
4. A canvas appears where you can create your high-level model
5. Right-click files and folders in the VSCODE file tree view and choose "Add Module" -> the module is added to the canvas
6. Draw edges/dependencies by dragging from top/bottom handler to bottom/top handler -> the first handler/module pressed becomes the source and has a usage-dependency on the second handler/module pressed.
7. Press compare to compute a reflextion model (green: correct, yellow: missing, red: wrong)
8. Press save to save the correct model in respect to the implementation

## Contribution guidelines

Work in progress

- Node v16.15.0 works
- Yarn v1.22.19 works
- VSCODE 1.78.0 works

1. Clone the repository
2. Run `yarn install`
3. Run build.sh
4. Press F5 to open the extension in development mode
