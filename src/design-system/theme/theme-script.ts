import {
  DEFAULT_THEME_MODE,
  THEME_COLOR_SCHEME,
  THEME_MODES,
} from "../tokens/tokens";
import { PREFERS_DARK_QUERY, THEME_STORAGE_KEY } from "./theme-config";

export function createThemeScript() {
  const config = JSON.stringify({
    key: THEME_STORAGE_KEY,
    modes: THEME_MODES,
    schemes: THEME_COLOR_SCHEME,
    fallback: DEFAULT_THEME_MODE,
  });
  return `(function(){var c=${config};var mode=c.fallback;try{var stored=localStorage.getItem(c.key);if(c.modes.indexOf(stored)>=0){mode=stored}else{var wanted=window.matchMedia&&window.matchMedia(${JSON.stringify(PREFERS_DARK_QUERY)}).matches?"dark":"light";for(var i=0;i<c.modes.length;i++){if(c.schemes[c.modes[i]]===wanted){mode=c.modes[i];break}}}}catch(e){}document.documentElement.dataset.theme=mode})();`;
}
