import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { onToggle } from '../../redux/actions';
import { Button } from '@patternfly/react-core/dist/js/components/Button/Button';
import BarsIcon from '@patternfly/react-icons/dist/js/icons/bars-icon';
import Logo from './Logo';

export const Brand = ({ toggleNav, navHidden }) => (
  <div className="pf-c-page__header-brand">
    <div hidden={navHidden} className="pf-c-page__header-brand-toggle">
      <Button variant="plain" aria-label="Toggle primary navigation" ouiaId="chrome-nav-toggle" onClick={() => toggleNav && toggleNav()}>
        <BarsIcon size="md" />
      </Button>
    </div>
    <a className="pf-c-page__header-brand-link" href="./">
      <Logo />
    </a>
  </div>
);

Brand.propTypes = {
  navHidden: PropTypes.bool,
  toggleNav: PropTypes.func,
};

function mapDispatchToProps(dispatch) {
  return {
    toggleNav: () => {
      dispatch(onToggle());
    },
  };
}

export default connect(({ chrome: { navHidden } }) => ({ navHidden }), mapDispatchToProps)(Brand);
