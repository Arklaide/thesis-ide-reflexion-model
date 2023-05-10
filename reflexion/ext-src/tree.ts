import * as pathmodule from "path";

interface Data {
  isFolder: boolean;
  dependencies: string[];
}
export class Node {
  public key: string;
  public data: Data;
  public parent: Node | null;
  public children: Node[];

  constructor(key: string, data: Data) {
    this.key = key;
    this.data = data;
    this.parent = null;
    this.children = [];
  }
}

export class Tree {
  public _root: any;

  constructor(key: string, data: Data) {
    let node = new Node(key, data);
    this._root = node;
  }

  // depth-first search
  find(key: string, node = this._root): Node | null {
    if (node.key === key) {
      return node;
    }

    for (let child of node.children) {
      const childFound = this.find(key, child);
      if (childFound && childFound.key === key) {
        return childFound;
      }
    }

    return null;
  }

  getAllDependencies(keyUN: string, dependenciesRec: string[] = []): string[] {
    console.log("inside getAllDependencies");
    let key: string = pathmodule.normalize(keyUN);
    if (key.charAt(0) === "\\" || key.charAt(0) === "/") key = key.substring(1); //.replace(/\\/g, "\\\\");
    const node = this.find(key) || this.find(key + ".py");
    if (!node) return dependenciesRec.length > 0 ? dependenciesRec : [];
    let dependencies: string[] =
      dependenciesRec.length > 0 ? dependenciesRec : [];
    console.log("key and dependencies: ", key, dependencies);
    if (node.data.dependencies) {
      dependencies = dependencies.concat(node.data.dependencies);
    }
    if (node.children.length === 0) return dependencies;
    for (let child of node.children) {
      dependencies = dependencies.concat(
        this.getAllDependencies(child.key, dependencies)
      );
    }
    return dependencies;
  }

  add(key: string, parentKey: string, data: Data) {
    let node = new Node(key, data);
    let parent = this.find(parentKey);

    if (parent) {
      parent.children.push(node);
      node.parent = parent;

      return node;
    } else {
      throw new Error(`Failed to add node: parent key ${parentKey} not found.`);
    }
  }

  remove(key: string) {
    let node = this.find(key);

    if (node && node.parent) {
      let parent = node.parent;
      let indexOfNode = parent.children.indexOf(node);
      parent.children.splice(indexOfNode, 1);
    } else {
      throw new Error(`Failed to remove node: node with key ${key} not found.`);
    }
  }

  //depth-first tree traversal
  forEach(callback: any, node = this._root) {
    if (!node) return;
    if (node.children) {
      for (let child of node.children) {
        this.forEach(callback, child);
      }
    }

    callback(node);
  }

  //breadth-first tree traversal
  forEachBreadthFirst(callback: any) {
    let queue = [];
    queue.push(this._root);

    while (queue.length > 0) {
      let node = queue.shift();

      callback(node);

      for (let child of node.children) {
        queue.push(child);
      }
    }
  }
}
