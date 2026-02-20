import type { AppViewTab } from '../types';
import { MAP_SCOPE_BY_TAB, type MapScope, type MapScopeByTab } from './view-state';

export interface NavigationState {
  activeAppTab: AppViewTab;
  selectedDate: string;
  mapScopeByTab: MapScopeByTab;
}

export function resolveActiveMapScope(tab: AppViewTab, mapScopeByTab: MapScopeByTab): MapScope {
  return mapScopeByTab[tab] ?? MAP_SCOPE_BY_TAB[tab];
}

export function transitionToTab(state: NavigationState, tab: AppViewTab): NavigationState {
  return {
    ...state,
    activeAppTab: tab,
  };
}

export function transitionToDate(state: NavigationState, date: string): NavigationState {
  return {
    ...state,
    selectedDate: date,
  };
}

export function transitionMapScopeFromControl(
  state: NavigationState,
  scope: MapScope,
): NavigationState {
  return {
    ...state,
    mapScopeByTab: {
      ...state.mapScopeByTab,
      [state.activeAppTab]: scope,
    },
  };
}

export function transitionToDayDetails(state: NavigationState, date: string): NavigationState {
  return {
    ...state,
    selectedDate: date,
    activeAppTab: 'day_detail',
    mapScopeByTab: {
      ...state.mapScopeByTab,
      day_detail: 'day',
    },
  };
}

export function transitionToFullTrip(state: NavigationState): NavigationState {
  return {
    ...state,
    activeAppTab: 'trip_overview',
  };
}

export function transitionToToday(state: NavigationState, todayDate: string): NavigationState {
  if (state.activeAppTab === 'day_detail') {
    return {
      ...state,
      selectedDate: todayDate,
      mapScopeByTab: {
        ...state.mapScopeByTab,
        day_detail: 'day',
      },
    };
  }

  return {
    ...state,
    selectedDate: todayDate,
  };
}
