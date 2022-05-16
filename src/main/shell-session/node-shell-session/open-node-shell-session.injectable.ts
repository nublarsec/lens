/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { Cluster } from "../../../common/cluster/cluster";
import type WebSocket from "ws";
import createKubectlInjectable from "../../kubectl/create-kubectl.injectable";
import { NodeShellSession } from "./node-shell-session";

export interface OpenNodeShellSessionArgs {
  websocket: WebSocket;
  cluster: Cluster;
  tabId: string;
  nodeName: string;
}

export type OpenNodeShellSession = (args: OpenNodeShellSessionArgs) => Promise<void>;

const openNodeShellSessionInjectable = getInjectable({
  id: "node-shell-session",

  instantiate: (di): OpenNodeShellSession => {
    const createKubectl = di.inject(createKubectlInjectable);

    return ({ cluster, tabId, ...args }) => {
      const kubectl = createKubectl(cluster.version);
      const session = new NodeShellSession({ cluster, terminalId: tabId, kubectl, ...args });

      return session.open();
    };
  },
});

export default openNodeShellSessionInjectable;
