import { useSelector } from 'react-redux';
import { useEffect, useMemo, useState } from 'react';
import { matchRoutes, useLocation } from 'react-router-dom';
import { Required } from 'utility-types';

import { ReduxState } from '../redux/store';
import useBundle from './useBundle';
import { NavItem, Navigation } from '../@types/types';
import { isExpandableNav } from '../utils/common';

function isNavItems(navigation: Navigation | NavItem[]): navigation is Navigation {
  return Array.isArray((navigation as Navigation).navItems);
}

function isActiveLeaf(item: NavItem | undefined): item is Required<NavItem, 'href'> {
  return typeof item?.href === 'string' && item?.active === true;
}

function isGroup(item: NavItem): item is Required<NavItem, 'groupId'> {
  return typeof item.groupId === 'string';
}

function extractNavItemGroups(activeNavigation: Navigation | NavItem[]) {
  return (isNavItems(activeNavigation) ? activeNavigation.navItems.map((item) => (isGroup(item) ? item.navItems : item)) : activeNavigation).flat();
}

function findActiveLeaf(navItems: (NavItem | undefined)[]): { activeItem: Required<NavItem, 'href'> | undefined; navItems: NavItem[] } {
  let leaf: Required<NavItem, 'href'> | undefined;
  // store the parent nodes
  const leafPath: NavItem[] = [];
  let index = 0;
  while (leaf === undefined && index < navItems.length) {
    const item = navItems[index];
    index += 1;
    if (item && isExpandableNav(item)) {
      const { activeItem, navItems } = findActiveLeaf(item.routes) || {};
      if (activeItem) {
        leaf = activeItem;
        // append parent nodes of an active item
        leafPath.push(item, ...navItems);
      }
    } else if (isActiveLeaf(item)) {
      leaf = item;
    }
  }

  return { activeItem: leaf, navItems: leafPath };
}

const useBreadcrumbsLinks = () => {
  const { bundleId, bundleTitle } = useBundle();
  const navigation = useSelector(({ chrome: { navigation } }: ReduxState) => navigation);
  const routes = useSelector(({ chrome: { moduleRoutes } }: ReduxState) => moduleRoutes);
  const { pathname } = useLocation();
  const [segments, setSegments] = useState<Required<NavItem, 'href'>[]>([]);
  const wildCardRoutes = useMemo(() => routes.map((item) => ({ ...item, path: `${item.path}/*` })), [routes]);

  useEffect(() => {
    const segments: Required<NavItem, 'href'>[] = [
      {
        title: bundleTitle,
        href: `/${bundleId}`,
      },
    ];
    const activeNavSegment = navigation[bundleId];
    if (activeNavSegment && isNavItems(activeNavSegment)) {
      const activeNavigation = extractNavItemGroups(activeNavSegment);
      const { activeItem, navItems } = findActiveLeaf(activeNavigation);
      if (activeItem) {
        const appFragments = activeItem.href.split('/');
        appFragments.pop();
        // Match first parent route. Routes are taken directly from router definitions.
        const fallbackMatch = matchRoutes(wildCardRoutes, activeItem.href) || [];
        const fallbackMatchFragments = fallbackMatch?.[0].pathnameBase.split('/');
        const groupFragments: Required<NavItem, 'href'>[] = navItems.map((item, index) => ({
          ...item,
          /**
           * Must be +3 because:
           * - first fragment is always empty "" (+1),
           * - second fragment is always bundle (+1),
           * - slice is exclusive and the matched index is not included (+1)
           * Even the root level link should always include the bundle.
           *  */
          href: fallbackMatchFragments.slice(0, index + 3).join('/') || `/${bundleId}`,
        }));
        segments.push(...groupFragments, activeItem);
      }
    }
    setSegments(segments);
  }, [pathname, navigation]);
  return segments;
};

export default useBreadcrumbsLinks;
