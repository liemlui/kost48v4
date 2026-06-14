import { resourceConfigs } from '../../config/resources';
import SimpleCrudPage from './SimpleCrudPage';

export type ConfiguredResourceName = keyof typeof resourceConfigs;

export default function ConfiguredResourcePage({
  resource,
}: {
  resource: ConfiguredResourceName;
}) {
  return <SimpleCrudPage config={resourceConfigs[resource]} />;
}
