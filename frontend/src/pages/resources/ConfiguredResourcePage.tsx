import { resourceConfigs } from '../../config/resources';
import SimpleCrudPage from './SimpleCrudPage';

export type ConfiguredResourceName = keyof typeof resourceConfigs;

export default function ConfiguredResourcePage({
  resource,
  hideAreaMenu,
}: {
  resource: ConfiguredResourceName;
  hideAreaMenu?: boolean;
}) {
  return <SimpleCrudPage config={resourceConfigs[resource]} hideAreaMenu={hideAreaMenu} />;
}
