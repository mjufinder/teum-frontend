// The teum theme. `astryx experimental theme editor` wrote this file once and never changes it again.
// The checked settings live in teum.settings.json and the generated teum.settings.ts;
// change them with `astryx experimental theme editor set teum ...`. Add your own changes below: they win over the settings.
import {defineTheme} from '@astryxdesign/core/theme';
import {teumSettings} from './teum.settings';

export const teumTheme = defineTheme({
  extends: teumSettings,
  name: 'teum',
});
