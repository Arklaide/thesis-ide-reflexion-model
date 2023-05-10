import ReactFlow, {
  addEdge,
  Background,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Node,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
  Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import React, { useCallback, useState, useEffect } from "react";
import { VSCodeMessage } from "./lib/VSCodeMessage";
import "./button.css";
import "./styles.css";

const initialN:
  | Node<any, string | undefined>[]
  | {
      id: any;
      data: { label: any };
      position: { x: any; y: any };
      className: any;
      style: {
        backgroundColor: any;
        width: any;
        height: any;
        coclor: any;
        wordWrap: any;
      };
      extent: any;
    }[] = [];

const initialNodes: any[] = [];

var shades: Map<number, string> = new Map();
shades.set(10, "rgb(28, 53, 69)");
shades.set(9, "rgb(28, 53, 69)");
shades.set(8, "rgb(28, 53, 69)");
shades.set(7, "rgb(28, 53, 69)");
shades.set(6, "rgb(28, 53, 69)");
shades.set(5, "rgb(28, 53, 69)");
shades.set(4, "rgb(35, 64, 84)");
shades.set(3, "rgb(41, 76, 99)");
shades.set(2, "rgb(47, 88, 115)");
shades.set(1, "rgb(54, 99, 130)");
shades.set(0, "rgb(60, 111, 145)");

const initialEdges = [{ id: "e1-2", source: "1", target: "2", animated: true }];

const NestedFlow1 = () => {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [dependenciesPerPath, setDependenciesPerPath] = useState([]);
  const [startNodeId, setStartNodeId] = useState<undefined | string>(undefined);

  useEffect(() => {
    return VSCodeMessage.onMessage((message) => handleMessage(message));
  });

  let handleMessage = function (message: any) {
    console.log("handleMessage", message);
    if (
      message &&
      message.data &&
      message.data.dependenciesPerPath &&
      message.data.command &&
      message.data.command === "compare-dep"
    ) {
      setDependenciesPerPath(message.data.dependenciesPerPath);
    } else if (
      message &&
      message.data &&
      message.data.toString().includes("update")
    ) {
      updateGraph(message.data.toString().substring(6));
    } else if (
      message &&
      message.data &&
      message.data.toString().includes("addmodule")
    ) {
      addModule(message.data.toString().substring(9));
    } else if (
      message &&
      message.data &&
      message.data.toString().includes("getGraph")
    ) {
      saveModel();
    }
  };
  let updateGraph = function (message: any) {
    const messageParsed = JSON.parse(JSON.parse(message));
    const nodes = messageParsed.nodes;
    const edges = messageParsed.edges;
    reactFlowInstance.setNodes(nodes);
    reactFlowInstance.setEdges(edges);
  };

  const onConnect = useCallback(
    (connection: any) => {
      const altConection = JSON.parse(JSON.stringify(connection));
      if (startNodeId) {
        if (connection.source !== startNodeId) {
          altConection.source = startNodeId;
          altConection.target = connection.source;
          altConection.sourceHandle = connection.targetHandle;
          altConection.targetHandle = connection.sourceHandle;
        }
      }
      altConection.markerEnd = {
        type: MarkerType.Arrow,
      };
      setEdges((eds) => addEdge(altConection, eds));
    },
    [startNodeId]
  );
  const onConnectStart = useCallback((params: any) => {
    setStartNodeId(params.target.dataset.nodeid);
  }, []);

  const addModule = useCallback((graph: any) => {
    const parsedNodes = JSON.parse(graph).nodes;
    const curNode = parsedNodes[parsedNodes.length - 1];

    const id = curNode.id;
    const labelarray = id.split("/");
    const label = ".../" + labelarray[labelarray.length - 1].slice(-22);
    const newNode: any = {
      id,
      position: {
        x: Math.random() * 500,
        y: Math.random() * 500,
      },
      data: {
        label: label,
      },
      className: "node-style",
      style: {
        backgroundColor: "rgb(63, 117, 153)",
        width: 270,
        height: 150,
        color: "#ffffff",
      },

      parentNode: curNode.parentNode,
      draggable: true,
    };
    if (curNode.parentNode !== "") {
      (newNode.className = "node-style"),
        (newNode.style = {
          backgroundColor: "rgb(89, 166, 217)",
          width: 248,
          height: 70,
          color: "#ffffff",
        });

      newNode.draggable = true;
    }

    var a = getLargestChild(newNode);
    var nodeChildren: NodeChildren = {
      parent: "",
      path: a.id,
      numberOfChildren: 0,
      list: [],
    };
    var ch = getAllChildrenLin(nodeChildren, newNode);
    ch.sort((a, b) => b.numberOfChildren - a.numberOfChildren);

    changeFamily(ch, newNode);
  }, []);

  function changeFamily(nodes: NodeChildren[], newRFNode: Node) {
    const map = new Map<string, number>();
    for (let node of nodes) {
      map.set(node.path, 0);
    }

    let nodesToPrint: any[] = [];

    nodes.forEach((element: NodeChildren) => {
      var curNode =
        newRFNode.id === element.path
          ? newRFNode
          : reactFlowInstance.getNode(element.path);

      if (curNode) {
        curNode.zIndex =
          element.numberOfChildren === 0 ? 0 : -element.numberOfChildren;
        if (element.path !== nodes[0].path && curNode) {
          const newDist = map.get(element.parent);
          curNode.position.y = (newDist ?? 0) + 150;
          curNode.position.x = 10;
          curNode.style = {
            color: "#ffffff",
            backgroundColor: shades.get(element.numberOfChildren),
          };

          map.set(element.parent, (newDist ?? 0) + 150);
        }
      }

      if (element.parent !== "" && curNode) {
        curNode.parentNode = element.parent;
      }
      if (element.numberOfChildren > 0 && curNode) {
        (curNode.className = "node-style"),
          (curNode.style = {
            backgroundColor: shades.get(element.numberOfChildren),
            width: 270,
            height: element.numberOfChildren * 250,
            color: "#ffffff",
          });
        curNode.width = 270;
        curNode.height = element.numberOfChildren * 250;
      }

      if (
        element.path === nodes[nodes.length - 1].path &&
        curNode &&
        element.numberOfChildren > 0
      ) {
        console.log("position of curnode before", curNode);
        if (curNode?.positionAbsolute?.x) {
          curNode.position.x = curNode.positionAbsolute.x;
        }
        if (curNode?.positionAbsolute?.y) {
          curNode.position.y = curNode.positionAbsolute.y;
        }
        console.log("position of curnode after", curNode);
      }

      nodesToPrint.push(curNode);

      if (curNode) {
        reactFlowInstance.addNodes(curNode);
      }
    });
    var restOfNodes = reactFlowInstance.getNodes();

    reactFlowInstance.setNodes(
      restOfNodes
        .filter((n) => !nodesToPrint.find((m) => m.id === n.id))
        .concat(nodesToPrint)
    );
    console.log("graph at current moment", nodesToPrint);
  }

  function getLargestChild(node: Node): Node {
    var nodes = reactFlowInstance.getNodes();
    nodes.push(node);
    var length = Number.MAX_VALUE;
    var largestParent: any = null;
    nodes.forEach((element: any) => {
      if (node.id.includes(element.id)) {
        if (element.id.length < length) {
          largestParent = element;
          length = element.id.length;
        }
      }
    });

    return largestParent;
  }
  interface NodeChildren {
    parent: string;
    path: string;
    numberOfChildren: number;
    list: NodeChildren[];
  }

  function getAllChildrenLin(
    node: NodeChildren,
    newRFNode: Node | undefined = undefined
  ): NodeChildren[] {
    var nodes = reactFlowInstance.getNodes();
    if (newRFNode) {
      nodes.push(newRFNode);
    }

    const array: NodeChildren[] = [];

    const family = nodes.filter(
      (n) => n.id.includes(node.path) && n.id !== node.path
    );

    var parentNode: NodeChildren = {
      parent: "",
      path: node.path,
      numberOfChildren: family.length,
      list: array,
    };
    array.push(parentNode);
    family.forEach((element: any) => {
      const includes = nodes.filter(
        (n) => element.id.includes(n.id) && n.id !== element.id
      );
      const includeschildren = nodes.filter(
        (n) => n.id.includes(element.id) && n.id !== element.id
      );
      const parent = includes.sort((a, b) => a.id.length - b.id.length)[
        includes.length - 1
      ];
      var newNode: NodeChildren = {
        parent: parent.id,
        path: element.id,
        numberOfChildren: includeschildren.length,
        list: array,
      };
      array.push(newNode);
    });
    return array;
  }

  const saveActualModel = useCallback(() => {
    var nodes = JSON.stringify(reactFlowInstance.getNodes(), null, 2);

    var edges = reactFlowInstance.getEdges();
    var edgesToSet: Edge[] = [];
    var edgesToDelete: Edge[] = [];
    edges.forEach((element: Edge) => {
      var color = element?.style?.stroke;
      const elementCopy = JSON.parse(JSON.stringify(element));
      console.log("test1");
      if (color && color === "#FF0000") {
        console.log("test3");

        edgesToDelete.push(elementCopy);
      } else {
        console.log("test2");
        if (elementCopy?.style) {
          elementCopy.style.stroke = "#FFFFFF";
        }
        console.log("test4");
        edgesToSet.push(elementCopy);
      }
    });
    reactFlowInstance.deleteElements({
      nodes: [],
      edges: reactFlowInstance.getEdges(),
    });
    setEdges([]);
    reactFlowInstance.setEdges(edgesToSet);
    setEdges(edgesToSet);
    var jsonEdges = JSON.stringify(edgesToSet);

    let graph = '{ "nodes" : ' + nodes + ',"edges" : ' + jsonEdges + "}";

    var Jgraph = JSON.parse(graph);
    VSCodeMessage.postMessage({
      command: "saveModel",
      data: JSON.stringify(Jgraph),
    });
  }, []);

  const saveModel = useCallback(() => {
    var grpahNodes = JSON.stringify(reactFlowInstance.getNodes(), null, 2);
    var graphEdges = JSON.stringify(reactFlowInstance.getEdges(), null, 2);
    let graph = '{ "nodes" : ' + grpahNodes + ',"edges" : ' + graphEdges + "}";

    var Jgraph = JSON.parse(graph);
    VSCodeMessage.postMessage({
      command: "saveModel",
      data: JSON.stringify(Jgraph),
    });
  }, []);

  const onNodeDoubleClick = useCallback((event: any, node: Node) => {
    console.log("dobule click", node.id);
    VSCodeMessage.postMessage({ command: "go-to-file", data: node.id });
  }, []);
  const onCompare = useCallback((paths: string[]) => {
    VSCodeMessage.postMessage({
      command: "compare",
      data: paths,
    });
  }, []);

  useEffect(() => {
    console.log("dependenciesPerPath", dependenciesPerPath);
    compareModelWithTree();
  }, [dependenciesPerPath]);

  const compareModelWithTree = () => {
    const newEdges: Edge[] = [];
    dependenciesPerPath.forEach(
      (dpp: { path: string; dependencies: string[] }) => {
        const dependencies = dpp.dependencies;
        const path = dpp.path;
        const currentEdges = edges.filter((e) => e.source === path);
        const toUseDependencies = dependencies.filter((d) =>
          nodes.some((n) => n.id === d || n.id === d + ".py")
        );

        const toUseOtherLevelDependencies = dependencies
          .filter((d) => nodes.some((n) => d.includes(n.id)))
          .filter((de) => !toUseDependencies.includes(de));

        for (let ce of currentEdges) {
          const edgeOK = toUseDependencies.some(
            (d) => d === ce.target || d + ".py" === ce.target
          );
          const childrentExistsSource = nodes.some(
            (n) => n.id.includes(path) && n.id !== path
          );
          const childrenExistsTarget = nodes.some(
            (n) => n.id.includes(ce.target) && n.id !== ce.target
          );
          const parentTarget = dependencies.find((d) => d.includes(ce.target));

          if (!edgeOK) {
            if (
              !childrenExistsTarget &&
              !childrentExistsSource &&
              !parentTarget
            ) {
              // Red edge
              if (
                !newEdges.some((e) => e.id === `${path}-${ce.target}`) &&
                nodes.some((n) => n.id === ce.target) &&
                nodes.some((n) => n.id === path)
              ) {
                console.log("red edge", path, ce.target);
                newEdges.push({
                  id: `${path}-${ce.target}`,
                  source: path,
                  target: ce.target,
                  markerEnd: {
                    type: MarkerType.Arrow,
                  },
                  style: {
                    strokeWidth: 2,
                    stroke: "#FF0000",
                  },
                });
              }
            } else if (childrenExistsTarget || childrentExistsSource) {
              // Red higher level edge
              const isOk = dependencies.some((d) => d.includes(ce.target));
              if (
                !newEdges.some((e) => e.id === `${path}-${ce.target}`) &&
                !isOk &&
                nodes.some((n) => n.id === ce.target) &&
                nodes.some((n) => n.id === path)
              ) {
                newEdges.push({
                  id: `${path}-${ce.target}`,
                  source: path,
                  target: ce.target,
                  markerEnd: {
                    type: MarkerType.Arrow,
                  },
                  style: {
                    strokeWidth: 2,
                    stroke: "#FF0000", //"#D5D5D5",
                  },
                });
              }
            }
          }
        }
        for (let d of toUseDependencies.concat(toUseOtherLevelDependencies)) {
          const childrenExistsTarget = nodes.some(
            (n) => n.id.includes(d) && n.id !== d
          );
          const childrentExistsSource = nodes.some(
            (n) => n.id.includes(path) && n.id !== path
          );
          const parentTargetList = nodes
            .filter((n) => dependencies.some((dep) => dep.includes(n.id)))
            .sort((a, b) => a.id.length - b.id.length)
            .filter((nf) => {
              const arr = nf.id.split("/");
              arr.pop();
              const checkPath = arr.join("/");
              let check;
              if (path.endsWith(".py")) {
                check =
                  nf.id !== path &&
                  !nf.id.endsWith(".py") &&
                  !path.includes(checkPath);
              } else {
                check = nf.id !== path && !nf.id.endsWith(".py");
              }
              return check;
            });
          const parentTarget = parentTargetList.find(
            (n) => !path.includes(n.id)
          );
          const parentTargetFinalList = parentTargetList.filter(
            (n) => !path.includes(n.id)
          );
          const selfParents = parentTargetList.filter((n) =>
            path.includes(n.id)
          );

          selfParents.forEach((sp) => {
            // TODO: check if all node children from this parent is in graph, if they are don't add this edge to this parent
            // but if they arent then add the edge, since the folder has nodes not present who dependends on the parent??
          });
          const edgeExists = currentEdges.some((e) => e.target === d);
          const edgeExistsParent = currentEdges.some((e) =>
            parentTargetFinalList.some((p) => p.id === e.target)
          );

          const edgeExistsPy = currentEdges.some((e) => e.target === d + ".py");

          if (edgeExists || edgeExistsPy || edgeExistsParent) {
            // Green edge
            const pathDepTest = nodes.some((n) => n.id === d)
              ? path !== d
              : path !== d + ".py";

            if (
              (!childrenExistsTarget || !childrentExistsSource) &&
              (pathDepTest || parentTargetFinalList.some((t) => t.id !== path))
            ) {
              if (parentTargetFinalList.length > 0) {
                for (let p of parentTargetFinalList) {
                  if (
                    !newEdges.some((e) => e.id === `${path}-${p.id}`) &&
                    nodes.some((n) => n.id === p.id) &&
                    nodes.some((n) => n.id === path) &&
                    currentEdges.some(
                      (e) => e.target === p.id && e.source === path
                    )
                  ) {
                    console.log("green edge", path, p.id);
                    newEdges.push({
                      id: `${path}-${p.id}`,
                      source: path,
                      target: p.id,
                      markerEnd: {
                        type: MarkerType.Arrow,
                      },
                      style: {
                        strokeWidth: 2,
                        stroke: "#00FF00",
                      },
                    });
                  }
                }
              }
              if (
                d !== path &&
                parentTargetFinalList.every((t) => t.id !== d)
              ) {
                if (
                  !newEdges.some(
                    (e) =>
                      e.id ===
                      `${path}-${nodes.some((n) => n.id === d) ? d : d + ".py"}`
                  ) &&
                  nodes.some(
                    (n) =>
                      n.id === (nodes.some((n) => n.id === d) ? d : d + ".py")
                  ) &&
                  nodes.some((n) => n.id === path)
                ) {
                  console.log(
                    "green edge 2",
                    path,
                    nodes.some((n) => n.id === d) ? d : d + ".py"
                  );
                  newEdges.push({
                    id: `${path}-${
                      nodes.some((n) => n.id === d) ? d : d + ".py"
                    }`,
                    source: path,
                    target: nodes.some((n) => n.id === d) ? d : d + ".py",
                    markerEnd: {
                      type: MarkerType.Arrow,
                    },
                    style: {
                      strokeWidth: 2,
                      stroke: "#00FF00",
                    },
                  });
                }
              }
            }
          }
          if (
            parentTargetFinalList.some(
              (t) => !currentEdges.map((ce) => ce.id).includes(t.id)
            ) ||
            !edgeExists ||
            !edgeExistsPy
          ) {
            // Yellow edge
            const pathDepTest = nodes.some((n) => n.id === d)
              ? path !== d
              : path !== d + ".py";

            if (
              (!childrenExistsTarget || !childrentExistsSource) &&
              (pathDepTest || parentTargetFinalList.some((t) => t.id !== path))
            ) {
              if (parentTargetFinalList.length > 0) {
                for (let p of parentTargetFinalList) {
                  if (
                    !newEdges.some((e) => e.id === `${path}-${p.id}`) &&
                    nodes.some((n) => n.id === p.id) &&
                    nodes.some((n) => n.id === path) &&
                    !currentEdges.some(
                      (e) => e.target === p.id && e.source === path
                    )
                  ) {
                    console.log("yellow edge", path, p.id);
                    newEdges.push({
                      id: `${path}-${p.id}`,
                      source: path,
                      target: p.id,
                      markerEnd: {
                        type: MarkerType.Arrow,
                      },
                      style: {
                        strokeWidth: 2,
                        stroke: "#FFFF00",
                      },
                    });
                  }
                }
              }
              if (
                d !== path &&
                parentTargetFinalList.every((t) => t.id !== d)
              ) {
                if (
                  !newEdges.some((e) => e.target === d && e.source === path)
                ) {
                  if (
                    !newEdges.some(
                      (e) =>
                        e.id ===
                        `${path}-${
                          nodes.some((n) => n.id === d) ? d : d + ".py"
                        }`
                    ) &&
                    nodes.some((n) => n.id === path) &&
                    nodes.some(
                      (n) =>
                        n.id === (nodes.some((n) => n.id === d) ? d : d + ".py")
                    )
                  ) {
                    console.log("yellow edge 2", path, d);
                    newEdges.push({
                      id: `${path}-${
                        nodes.some((n) => n.id === d) ? d : d + ".py"
                      }`,
                      source: path,
                      target: nodes.some((n) => n.id === d) ? d : d + ".py",
                      markerEnd: {
                        type: MarkerType.Arrow,
                      },
                      style: {
                        strokeWidth: 2,
                        stroke: "#FFFF00",
                      },
                    });
                  }
                }
              }
            }
          }
        }
      }
    );
    setEdges(newEdges);
  };

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onNodeDoubleClick={onNodeDoubleClick}
        className="react-flow-subflows-example"
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
      <button onClick={saveActualModel} className="button-4">
        Save model
      </button>
      <button
        onClick={() => onCompare(nodes.map((node) => node.id))}
        className="button-5"
      >
        Compare
      </button>
    </>
  );
};

export default function NestedFlow() {
  useEffect(() => {
    return VSCodeMessage.onMessage((message) => console.log("app", message));
  });

  return (
    <ReactFlowProvider>
      <NestedFlow1 />
    </ReactFlowProvider>
  );
}
