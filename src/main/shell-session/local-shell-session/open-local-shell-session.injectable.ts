/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { LocalShellSessionDependencies } from "./local-shell-session";
import { LocalShellSession } from "./local-shell-session";
import type { Cluster } from "../../../common/cluster/cluster";
import type WebSocket from "ws";
import createKubectlInjectable from "../../kubectl/create-kubectl.injectable";
import terminalShellEnvModifiersInjectable from "../shell-env-modifier/terminal-shell-env-modify.injectable";
import baseBundeledBinariesDirectoryInjectable from "../../../common/vars/base-bundled-binaries-dir.injectable";

export interface OpenLocalShellSessionArgs {
  websocket: WebSocket;
  cluster: Cluster;
  tabId: string;
}

export type OpenLocalShellSession = (args: OpenLocalShellSessionArgs) => Promise<void>;

const openLocalShellSessionInjectable = getInjectable({
  id: "open-local-shell-session",
  instantiate: (di): OpenLocalShellSession => {
    const createKubectl = di.inject(createKubectlInjectable);
    const deps: LocalShellSessionDependencies = {
      terminalShellEnvModify: di.inject(terminalShellEnvModifiersInjectable),
      baseBundeledBinariesDirectory: di.inject(baseBundeledBinariesDirectoryInjectable),
    };

    return ({ cluster, tabId, ...args }) => {
      const kubectl = createKubectl(cluster.version);
      const session = new LocalShellSession(deps, { cluster, kubectl, terminalId: tabId, ...args });

      return session.open();
    };
  },
});

export default openLocalShellSessionInjectable;
