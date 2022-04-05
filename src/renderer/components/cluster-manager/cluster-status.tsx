/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./cluster-status.module.scss";

import { computed, observable } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import { ipcRendererOn } from "../../../common/ipc";
import type { Cluster } from "../../../common/cluster/cluster";
import type { IClassName } from "../../utils";
import { isBoolean, hasTypedProperty, isObject, isString, cssNames, getOrInsert } from "../../utils";
import { Button } from "../button";
import { Icon } from "../icon";
import { Spinner } from "../spinner";
import type { ClusterId, KubeAuthUpdate } from "../../../common/cluster-types";
import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";
import { requestClusterActivation } from "../../ipc";
import type { NavigateToEntitySettings } from "../../../common/front-end-routing/routes/entity-settings/navigate-to-entity-settings.injectable";
import { withInjectables } from "@ogre-tools/injectable-react";
import navigateToEntitySettingsInjectable from "../../../common/front-end-routing/routes/entity-settings/navigate-to-entity-settings.injectable";
import catalogEntityRegistryInjectable from "../../api/catalog/entity/registry.injectable";

export interface ClusterStatusProps {
  className?: IClassName;
  cluster: Cluster;
}

interface Dependencies {
  navigateToEntitySettings: NavigateToEntitySettings;
  entityRegistry: CatalogEntityRegistry;
}

@observer
class NonInjectedClusterStatus extends React.Component<ClusterStatusProps & Dependencies> {
  private readonly authOutputs = observable.map<ClusterId, KubeAuthUpdate[]>();
  private readonly reconnecting = observable.set<ClusterId>();

  private readonly authOutput = computed(() => this.authOutputs.get(this.clusterId) ?? []);
  private readonly hasErrors = computed(() => this.authOutput.get().some(({ isError }) => isError));
  private readonly isReconnecting = computed(() => this.reconnecting.has(this.clusterId));
  private readonly clusterName = computed(() => {
    const entity = this.props.entityRegistry.getById(this.clusterId);
    const { cluster } = this.props;

    return entity?.getName() ?? cluster.name;
  });

  private get clusterId() {
    return this.props.cluster.id;
  }

  componentDidMount() {
    disposeOnUnmount(this, [
      ipcRendererOn("cluster:connection-update", (evt, clusterId: ClusterId, update: unknown) => {
        if (
          isObject(update)
          && hasTypedProperty(update, "message", isString)
          && hasTypedProperty(update, "isError", isBoolean)
        ) {
          getOrInsert(this.authOutputs, clusterId, []).push(update);
        } else {
          console.warn(`Got invalid connection update for ${clusterId}`, { update });
        }
      }),
    ]);
  }

  private reconnect = async () => {
    this.authOutputs.delete(this.clusterId);
    this.reconnecting.add(this.clusterId);

    try {
      await requestClusterActivation(this.clusterId, true);
    } catch (error) {
      getOrInsert(this.authOutputs, this.clusterId, []).push({
        message: String(error),
        isError: true,
      });
    } finally {
      this.reconnecting.delete(this.clusterId);
    }
  };

  private manageProxySettings = () => {
    this.props.navigateToEntitySettings(this.clusterId, "proxy");
  };

  private renderAuthenticationOutput() {
    return (
      <pre>
        {
          this.authOutput
            .get()
            .map(({ message, isError }, index) => (
              <p key={index} className={cssNames({ error: isError })}>
                {message.trim()}
              </p>
            ))
        }
      </pre>
    );
  }

  private renderStatusIcon() {
    if (this.hasErrors.get()) {
      return <Icon material="cloud_off" className={styles.icon} />;
    }

    return (
      <>
        <Spinner singleColor={false} className={styles.spinner} />
        <pre className="kube-auth-out">
          <p>
            {this.isReconnecting ? "Reconnecting" : "Connecting"}
            &hellip;
          </p>
        </pre>
      </>
    );
  }

  private renderReconnectionHelp() {
    if (this.hasErrors.get() && !this.isReconnecting.get()) {
      return (
        <>
          <Button
            primary
            label="Reconnect"
            className="box center"
            onClick={this.reconnect}
            waiting={this.isReconnecting.get()}
          />
          <a
            className="box center interactive"
            onClick={this.manageProxySettings}
          >
            Manage Proxy Settings
          </a>
        </>
      );
    }

    return undefined;
  }

  render() {
    return (
      <div className={cssNames(styles.status, "flex column box center align-center justify-center", this.props.className)}>
        <div className="flex items-center column gaps">
          <h2>{this.clusterName.get()}</h2>
          {this.renderStatusIcon()}
          {this.renderAuthenticationOutput()}
          {this.renderReconnectionHelp()}
        </div>
      </div>
    );
  }
}

export const ClusterStatus = withInjectables<Dependencies, ClusterStatusProps>(NonInjectedClusterStatus, {
  getProps: (di, props) => ({
    ...props,
    navigateToEntitySettings: di.inject(navigateToEntitySettingsInjectable),
    entityRegistry: di.inject(catalogEntityRegistryInjectable),
  }),
});
