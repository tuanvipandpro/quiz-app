import React, { useId, useRef, useState } from 'react';
import { Avatar, Button, Dropdown } from 'antd';
import { FolderOutlined, LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';

export default function AccountMenu({ user, onSettings, onSignOut, onNavigate }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const menuId = useId();
  const name = user.displayName || user.email || t('Account');
  const activate = ({ domEvent }, action) => {
    // Enter is handled by the menu on keydown. Prevent a native click from
    // reaching the trigger after focus moves back and reopening the menu.
    domEvent.preventDefault();
    setOpen(false);
    // Dialogs opened by the action should return focus to this persistent button.
    trigger.current?.focus();
    action();
  };

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      autoFocus
      open={open}
      onOpenChange={(nextOpen) => setOpen(nextOpen)}
      menu={{
        id: menuId,
        'aria-label': t('Account'),
        className: 'account-menu',
        items: [
          { key: 'name', label: name, disabled: true },
          {
            key: 'profile',
            label: t('Profile'),
            icon: <UserOutlined aria-hidden="true" />,
            onClick: (event) => activate(event, () => onNavigate('#/profile')),
          },
          {
            key: 'quizzes',
            label: t('Manage quizzes'),
            icon: <FolderOutlined aria-hidden="true" />,
            onClick: (event) => activate(event, () => onNavigate('#/my-quizzes')),
          },
          {
            key: 'settings',
            label: t('AI Settings'),
            icon: <SettingOutlined aria-hidden="true" />,
            onClick: (event) => activate(event, onSettings),
          },
          { type: 'divider' },
          {
            key: 'logout',
            label: t('Sign out'),
            icon: <LogoutOutlined aria-hidden="true" />,
            onClick: (event) => activate(event, onSignOut),
            danger: true,
          },
        ],
      }}
    >
      <Button
        ref={trigger}
        type="text"
        className="profile-button"
        aria-label={name}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <Avatar size={28} src={user.photoURL} icon={<UserOutlined aria-hidden="true" />} />
      </Button>
    </Dropdown>
  );
}
