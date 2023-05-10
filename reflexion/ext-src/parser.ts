import * as fs from "fs";
import * as pathmodule from "path";
import * as vscode from "vscode";
import * as grubber from "@digitak/grubber";
import { Tree, Node } from "./tree";

export class Parser {
  private static instance: Parser;
  public tree: Tree;
  private path: string;
  private initMap: Map<string, { import: string; from: string }>;

  private constructor(path: vscode.Uri) {
    this.path = path.fsPath;
    this.tree = new Tree(pathmodule.normalize(this.path), {
      isFolder: true,
      dependencies: [],
    });
    this.initMap = new Map();
  }

  public static getInstance(path: vscode.Uri): Parser {
    if (!Parser.instance) {
      Parser.instance = new Parser(path);
    }
    return Parser.instance;
  }

  public createTree() {
    this.tree = new Tree(pathmodule.normalize(this.path), {
      isFolder: true,
      dependencies: [],
    });
    const getAllFiles = function (dirPath: any, arrayOfFiles: any) {
      let files = fs.readdirSync(dirPath);
      arrayOfFiles = arrayOfFiles || [];

      files.forEach(function (file) {
        if (fs.statSync(pathmodule.join(dirPath, file)).isDirectory()) {
          arrayOfFiles = getAllFiles(
            pathmodule.join(dirPath, file),
            arrayOfFiles
          );
        } else {
          arrayOfFiles.push(pathmodule.join(dirPath, file));
        }
      });
      return arrayOfFiles;
    };
    const allFiles = getAllFiles(this.path, []);

    const mapped = allFiles
      .filter((file: string) => /^.*\.(py)/.test(file))
      .map((file: string) =>
        this.mapDependenciesToFile(file, this.path, allFiles)
      );
    mapped.forEach((m: any) => {
      let newFilePath = m.filePath.replace(this.path, "");
      if (newFilePath.charAt(0) == pathmodule.sep)
        newFilePath = newFilePath.substr(1);
      const newFilePathArray = newFilePath.split(pathmodule.sep);

      let newNodeFilePath: string;
      newFilePathArray.forEach((filePath: string, index: number) => {
        const isFolder = !/^.*\.(py)/.test(filePath);
        if (index === 0) {
          newNodeFilePath = pathmodule.join(this.path, newFilePathArray[index]);
        }
        const existingNode = this.tree.find(newNodeFilePath);
        if (index !== 0) {
          newNodeFilePath = pathmodule.join(
            newNodeFilePath,
            newFilePathArray[index]
          );
        }
        if (existingNode && existingNode.key !== newNodeFilePath) {
          this.tree.add(
            pathmodule.normalize(newNodeFilePath),
            pathmodule.normalize(existingNode.key),
            {
              isFolder: isFolder,
              dependencies: isFolder ? [] : m.dependencies,
            }
          );
        } else if (!existingNode) {
          this.tree.add(
            pathmodule.normalize(newNodeFilePath),
            this.tree._root.key,
            {
              isFolder: isFolder,
              dependencies: isFolder ? [] : m.dependencies,
            }
          );
        }
      });
    });
  }

  private mapDependenciesToFile(
    filePath: string,
    path: string,
    allFiles: string[]
  ) {
    const fileContent = getContent(filePath);
    const grubbed = grubber.grub(fileContent, "py").findDependencies();
    const dependencies = grubbed.map((f: any) => {
      return { dep: f.groups[0] && f.groups[0].toLowerCase(), rest: f };
    });
    const extraDependencies: string[] = [];
    const filteredDependencies = dependencies
      .filter((d: any) => typeof d.dep === "string")
      .map((d: any) => {
        const dependency = pathmodule.join(
          path,
          d.dep.replace(/\./g, pathmodule.sep)
        );
        const filesArr = d.rest.groups[2].split(", ");
        const dependencyFiles = filesArr.map((f: string) =>
          pathmodule.join(
            path,
            d.dep.replace(/\./g, pathmodule.sep) + pathmodule.sep + f + ".py"
          )
        );
        dependencyFiles.forEach((df: string) => {
          if (allFiles.includes(df)) {
            extraDependencies.push(df);
          }
        });
        if (allFiles.includes(dependency + ".py")) {
          return dependency + ".py";
        } else if (
          allFiles.includes(dependency + pathmodule.sep + "__init__.py")
        ) {
          const importedModule = grubbed.find(
            (f: any) => f.groups[0] && f.groups[0].toLowerCase() === d.dep
          );
          if (importedModule) {
            const initVal = this.initMap.get(
              dependency + pathmodule.sep + "__init__.py"
            );
            if (initVal) {
              // TODO
            } else {
              const imports = importedModule.groups[2].split(", ");
              const initFileContent = getContent(
                dependency + pathmodule.sep + "__init__.py"
              );
              const initGrubbed = grubber
                .grub(initFileContent, "py")
                .findDependencies();
              imports.forEach((i: string) => {
                const matchInt = initGrubbed
                  .find((ig) => i === ig.groups[2])
                  ?.groups[0].substring(1);
                if (matchInt) {
                  extraDependencies.push(
                    dependency + pathmodule.sep + matchInt
                  );
                }
              });
              return dependency;
            }
          }
        } else {
          return dependency;
        }
      });

    const extraGrub = grubber
      .grub(fileContent, "py")
      .find(/^\s*(?:from|import)\s+((\w+(?:\s*,\s*\w+)*\.*)*)/);
    extraGrub.forEach((t: any) => {
      const dep = pathmodule.join(
        path,
        t.groups[0].replace(/\./g, pathmodule.sep)
      );
      if (
        allFiles.includes(dep + ".py") &&
        !extraDependencies.includes(dep + ".py") &&
        !filteredDependencies.includes(dep + ".py")
      )
        extraDependencies.push(dep + ".py");
    });

    return {
      filePath,
      dependencies: filteredDependencies.concat(extraDependencies),
    };
  }
}

export function getDependencies(path: vscode.Uri) {
  const tree = new Tree(path.fsPath, { isFolder: true, dependencies: [] });
  const getAllFiles = function (dirPath: any, arrayOfFiles: any) {
    let files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
      if (fs.statSync(pathmodule.join(dirPath, file)).isDirectory()) {
        arrayOfFiles = getAllFiles(
          pathmodule.join(dirPath, file),
          arrayOfFiles
        );
      } else {
        arrayOfFiles.push(pathmodule.join(dirPath, file));
      }
    });
    return arrayOfFiles;
  };
  const allFiles = getAllFiles(path.fsPath, []);
  const requirements = fs
    .readFileSync(
      allFiles.find(
        (file: string) =>
          file == path.fsPath + pathmodule.sep + "requirements.txt"
      ),
      "utf-8"
    )
    .toString()
    .split("\n")
    .map((line: string) => line.substring(0, line.indexOf("==")))
    .map((line: string) => line.toLocaleLowerCase());
  const mapped = allFiles
    .filter((file: string) => /^.*\.(py)/.test(file))
    .map((file: string) =>
      mapDependenciesToFile(file, requirements, path.fsPath)
    );
  mapped.forEach((m: any) => {
    let newFilePath = m.filePath.replace(path.fsPath, "");
    if (newFilePath.charAt(0) == pathmodule.sep)
      newFilePath = newFilePath.substr(1);
    const newFilePathArray = newFilePath.split(pathmodule.sep);

    let newNodeFilePath: string;
    newFilePathArray.forEach((filePath: string, index: number) => {
      const isFolder = !/^.*\.(py)/.test(filePath);
      if (index === 0) {
        newNodeFilePath = pathmodule.join(path.fsPath, newFilePathArray[index]);
      }
      const existingNode = tree.find(newNodeFilePath);
      if (index !== 0) {
        newNodeFilePath = pathmodule.join(
          newNodeFilePath,
          newFilePathArray[index]
        );
      }
      if (existingNode && existingNode.key !== newNodeFilePath) {
        tree.add(newNodeFilePath, existingNode.key, {
          isFolder: isFolder,
          dependencies: isFolder ? [] : m.dependencies,
        });
      } else if (!existingNode) {
        tree.add(newNodeFilePath, tree._root.key, {
          isFolder: isFolder,
          dependencies: isFolder ? [] : m.dependencies,
        });
      }
    });
  });
  tree.forEachBreadthFirst((node: Node) => console.log(node.key));
}

const getContent = function (filePath: string) {
  const fileContent = fs.readFileSync(filePath, "utf8");
  return fileContent;
};

const mapDependenciesToFile = function (
  filePath: string,
  requirements: string[],
  path: string
) {
  const fileContent = getContent(filePath);
  const grubbed = grubber.grub(fileContent, "py").findDependencies();
  const dependencies = grubbed.map(
    (f: any) => f.groups[0] && f.groups[0].toLowerCase()
  );
  const filteredDependencies = dependencies
    .filter(
      (d: string) =>
        typeof d === "string" &&
        !requirements.includes(d.split(".")[0].toLowerCase())
    )
    .map((d: string) => pathmodule.join(path, d.replace(".", pathmodule.sep)));

  return { filePath, dependencies: filteredDependencies };
};
