import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bullseye,
  Menu,
  MenuContent,
  MenuItem,
  MenuList,
  SearchInput as PFSearchInput,
  Popper,
  SearchInputProps,
  Spinner,
} from '@patternfly/react-core';
import debounce from 'lodash/debounce';

import './SearchInput.scss';
import ChromeLink from '../ChromeLink';
import SearchDescription from './SearchDescription';

const REPLACE_TAG = '@query';
/**
 * The ?q is the search term.
 * ------
 * The "~" after the search term enables fuzzy search (case sensitivity, similar results for typos).
 * For example "inventry" query yields results with Inventory string within it.
 * We can use distance ~(0-2) for example: "~2" to narrow restrict/expand the fuzzy search range
 *
 * Query parsin docs: https://solr.apache.org/guide/7_7/the-standard-query-parser.html#the-standard-query-parser
 */
const BASE_URL = `https://access.stage.redhat.com/hydra/rest/search/platform/console/?q=${REPLACE_TAG}~10&fq=documentKind:ModuleDefinition&rows=10&mm=4`;

export type SearchResultItem = {
  abstract: string;
  allTitle: string;
  bundle: string[];
  bundle_title: string[];
  documentKind: string;
  id: string;
  relative_uri: string;
  view_uri: string;
};

export type SearchResponseType = {
  docs: SearchResultItem[];
  start: number;
  numFound: number;
  maxScore: number;
};

const SearchInput = () => {
  const isEnabled = localStorage.getItem('chrome:experimental:search') === 'true';
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponseType>({
    docs: [],
    maxScore: 0,
    numFound: 0,
    start: 0,
  });

  const isMounted = useRef(false);
  const toggleRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMenuKeys = (event: KeyboardEvent) => {
    if (!isOpen) {
      return;
    }
    if (menuRef.current?.contains(event.target as Node) || toggleRef.current?.contains(event.target as Node)) {
      if (event.key === 'Escape' || event.key === 'Tab') {
        setIsOpen(!isOpen);
        toggleRef.current?.focus();
      }
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (isOpen && !menuRef.current?.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  const onInputClick: SearchInputProps['onClick'] = (ev) => {
    ev.stopPropagation(); // Stop handleClickOutside from handling, it would close the menu
    searchResults.numFound > 0 && setIsOpen(true);
  };

  const onToggleKeyDown: SearchInputProps['onKeyDown'] = (ev) => {
    ev.stopPropagation(); // Stop handleClickOutside from handling, it would close the menu
    if (!isOpen) {
      setIsOpen(true);
    }

    if (isOpen && ev.key === 'ArrowDown' && menuRef.current) {
      const firstElement = menuRef.current.querySelector('li > button:not(:disabled), li > a:not(:disabled)');
      firstElement && (firstElement as HTMLElement).focus();
    } else if (isOpen && ev.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleMenuKeys);
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleMenuKeys);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, menuRef]);

  if (!isEnabled) {
    return null;
  }

  const handleFetch = (value: string) => {
    return fetch(BASE_URL.replace(REPLACE_TAG, value))
      .then((r) => r.json())
      .then(({ response }: { response: SearchResponseType }) => {
        isMounted.current && setSearchResults(response);
      })
      .finally(() => {
        isMounted.current && setIsFetching(false);
      });
  };

  const debouncedFetch = useCallback(debounce(handleFetch, 500), []);

  const handleChange: SearchInputProps['onChange'] = (value) => {
    setSearchValue(value);
    setIsFetching(true);
    debouncedFetch(value);
  };

  const toggle = (
    <PFSearchInput
      onClick={onInputClick}
      ref={toggleRef}
      onKeyDown={onToggleKeyDown}
      placeholder="Search for services"
      value={searchValue}
      onChange={handleChange}
      className="chr-c-search__input"
    />
  );

  const menu = (
    <Menu ref={menuRef} className="pf-u-mt-xs">
      <MenuContent>
        <MenuList>
          {isFetching ? (
            <Bullseye className="pf-u-p-md">
              <Spinner size="xl" />
            </Bullseye>
          ) : (
            searchResults.docs.map(({ id, allTitle, bundle, bundle_title, abstract, relative_uri }) => (
              <MenuItem
                component={(props) => <ChromeLink {...props} href={relative_uri} />}
                description={<SearchDescription bundle={bundle[0]} description={abstract} bundleTitle={bundle_title[0]} />}
                key={id}
              >
                {allTitle}
              </MenuItem>
            ))
          )}
          {/* TODO: Add empty state */}
          {searchResults.numFound === 0 && !isFetching && <MenuItem>No matching results</MenuItem>}
        </MenuList>
      </MenuContent>
    </Menu>
  );

  return (
    <div ref={containerRef} className="chr-c-search__input">
      <Popper trigger={toggle} popper={menu} appendTo={containerRef.current || undefined} isVisible={isOpen} />
    </div>
  );
};

export default SearchInput;
