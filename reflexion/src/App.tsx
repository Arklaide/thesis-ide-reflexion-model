import NestedFlow from "./NestedFlow";
import SubFlow from "./SubFlow";
import "./styles.css";
import React, { useEffect } from "react";

import "reactflow/dist/style.css";
import "./App.css";
import { VSCodeMessage } from "./lib/VSCodeMessage";

const Nest = () => {
  useEffect(() => {
    return VSCodeMessage.onMessage((message) => console.log("app", message));
  });
  return <NestedFlow />;
};

export default function App() {
  useEffect(() => {
    return VSCodeMessage.onMessage((message) => console.log("app", message));
  });
  return <Nest />;
}
