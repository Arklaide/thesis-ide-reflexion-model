import * as pathmodule from "path";
import * as vscode from "vscode";
import * as fs from "fs";
import { Parser } from "./parser";

const workspaceFolder = vscode.workspace.workspaceFolders
  ? vscode.workspace.workspaceFolders[0].uri
  : undefined;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("react-webview.start", () => {
      ReactPanel.createOrShow(context.extensionPath);
      setTimeout(() => {
        createGraph();
        sendGraph();
      }, 1000);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.sayHello", (x: any) => {
      console.log("calling add module");
      addModule(x);
    })
  );

  const getDependenciesCommand = () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return;
    }
    const parser = Parser.getInstance(workspaceFolders[0].uri);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "reflexion.getDependencies",
      getDependenciesCommand
    )
  );
}

let sendGraph = function () {
  console.log("adding module");
  var rawdata = fs.readFileSync(
    pathmodule.normalize(
      workspaceFolder?.fsPath + pathmodule.sep + "ReflexionModelGraph.json"
    ),
    "utf8"
  );

  console.log("read file");
  ReactPanel.sendMessage("update" + JSON.stringify(rawdata));
};

let createGraph = function () {
  const fs = require("fs");

  if (
    fs.existsSync(
      pathmodule.normalize(
        workspaceFolder?.fsPath + pathmodule.sep + "ReflexionModelGraph.json"
      )
    )
  ) {
    console.log("File exists");
  } else {
    console.log("writing to rmg");
    const data = { nodes: [], edges: [] };
    console.log(
      "filepath: ",
      pathmodule.normalize(
        workspaceFolder?.fsPath + pathmodule.sep + "ReflexionModelGraph.json"
      )
    );
    fs.writeFile(
      pathmodule.normalize(
        workspaceFolder?.fsPath + pathmodule.sep + "ReflexionModelGraph.json"
      ),
      JSON.stringify(data),
      "utf8",
      function (err) {
        if (err) throw err;
        console.log("complete");
      }
    );
  }
};

let saveModel = function (s: string) {
  console.log("logging message from save model", s);

  fs.writeFile(
    pathmodule.normalize(
      workspaceFolder?.fsPath + pathmodule.sep + "ReflexionModelGraph.json"
    ),
    s,
    "utf8",
    function (err) {
      if (err) throw err;
      console.log("complete");
    }
  );
};
let addModule = function (path) {
  setTimeout(() => {
    ReactPanel.sendMessage("getGraph");
  }, 3000);

  console.log("adding module");
  var rawdata = fs.readFileSync(
    pathmodule.normalize(
      workspaceFolder?.fsPath + pathmodule.sep + "ReflexionModelGraph.json"
    ),
    "utf8"
  );
  console.log("read file");
  let graph = JSON.parse(rawdata);

  let Parrent = "";
  let iter = 0;
  let excist = false;
  console.log("read file2");
  graph.nodes.forEach(function (value: any) {
    if (path.path != value.id) {
      if (path.path.includes(value.id)) {
        Parrent = Parrent.length > value.id.length ? Parrent : value.id;
      }
      iter = iter + 1;
    } else {
      excist = true;
    }
  });

  if (!excist) {
    graph.nodes.push({
      id: path.path,
      data: { label: path.path },
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      className: "node-style",
      style: {
        backgroundColor: "rgba(105, 195, 255, 1)",
        width: 270,
        height: 150,
        color: "#ffffff",
      },
      parentNode: Parrent,
    });
  }

  console.log("added Module", graph);
  ReactPanel.sendMessage("addmodule" + JSON.stringify(graph));
};

class ReactPanel {
  public static currentPanel: ReactPanel | undefined;

  private static readonly viewType = "react";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionPath: string;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionPath: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ReactPanel.currentPanel) {
      ReactPanel.currentPanel._panel.reveal(column);
    } else {
      ReactPanel.currentPanel = new ReactPanel(
        extensionPath,
        column || vscode.ViewColumn.One
      );
    }
  }

  private constructor(extensionPath: string, column: vscode.ViewColumn) {
    this._extensionPath = extensionPath;

    this._panel = vscode.window.createWebviewPanel(
      ReactPanel.viewType,
      "Model Canvas",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(pathmodule.join(this._extensionPath, "build")),
        ],
      }
    );

    this._panel.webview.html = this._getHtmlForWebview();

    this._panel.webview.postMessage({ test: "blah" });
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message) => {
        console.log(message);
        switch (message.command) {
          case "go-to-file":
            const fileUri = vscode.Uri.file(message.data);
            vscode.window.showTextDocument(fileUri);
          case "saveModel":
            saveModel(message.data);
          case "alert":
            vscode.window.showErrorMessage(message.text);
            return;
          case "compare":
            if (workspaceFolder) {
              const parser = Parser.getInstance(workspaceFolder);
              parser.createTree();
              const depedenciesPerPath: {
                path: string;
                dependencies: string[];
              }[] = [];
              function onlyUnique(value, index, array) {
                return array.indexOf(value) === index;
              }
              message.data.forEach((path) => {
                const dependencies: string[] = [];
                let nodePath: string = pathmodule.normalize(path);
                if (
                  (nodePath.charAt(0) === "\\" || nodePath.charAt(0) === "/") &&
                  /(\/|\\)\D*:/.test(nodePath)
                ) {
                  nodePath = nodePath.substring(1);
                }
                const node = parser.tree.find(nodePath);
                const test = parser.tree.forEach((node) => {
                  node.data.dependencies.forEach((dep) => {
                    if (dep) {
                      let depPath = pathmodule.normalize(dep);
                      depPath = depPath.replace(/\\/g, "/");
                      if (!(depPath.charAt(0) === "/")) {
                        depPath = "/" + depPath;
                      }

                      dependencies.push(depPath);
                    }
                  });
                  return node.data.dependencies;
                }, node);

                depedenciesPerPath.push({
                  path: path,
                  dependencies: dependencies.filter(onlyUnique),
                });
              });
              this._panel.webview.postMessage({
                command: "compare-dep",
                dependenciesPerPath: depedenciesPerPath,
              });
            }
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    ReactPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
  public static sendMessage(s) {
    console.log("Sending message");
    ReactPanel.currentPanel?._panel.webview.postMessage(s);

    console.log("Message sent");
  }

  private _getHtmlForWebview() {
    const manifest = require(pathmodule.join(
      this._extensionPath,
      "build",
      "asset-manifest.json"
    ));
    const mainScript = manifest["files"]["main.js"];
    const mainStyle = manifest["files"]["main.css"];

    const scriptPathOnDisk = vscode.Uri.file(
      pathmodule.join(this._extensionPath, "build", mainScript)
    );
    const scriptUri = scriptPathOnDisk.with({ scheme: "vscode-resource" });
    const stylePathOnDisk = vscode.Uri.file(
      pathmodule.join(this._extensionPath, "build", mainStyle)
    );
    const styleUri = stylePathOnDisk.with({ scheme: "vscode-resource" });

    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<title>React App</title>
				<link rel="stylesheet" type="text/css" href="${styleUri}">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}';style-src vscode-resource: 'unsafe-inline' http: https: data:;">
				<base href="${vscode.Uri.file(
          pathmodule.join(this._extensionPath, "build")
        ).with({
          scheme: "vscode-resource",
        })}/">
			</head>

			<body>
				<noscript>You need to enable JavaScript to run this app.</noscript>
				<div id="root"></div>
				
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
