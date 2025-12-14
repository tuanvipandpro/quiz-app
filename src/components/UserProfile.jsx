// components/UserProfile.jsx
import React from 'react';
import { Card, Avatar, Typography, Space, Tag, Descriptions } from 'antd';
import { UserOutlined, MailOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

const { Title, Text } = Typography;

/**
 * User Profile Component
 * Displays detailed user information
 */
function UserProfile() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <Card>
        <Text type="secondary">Please sign in to view your profile</Text>
      </Card>
    );
  }

  return (
    <Card 
      style={{ maxWidth: 600, margin: '20px auto' }}
      title={
        <Space>
          <UserOutlined />
          <span>User Profile</span>
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Avatar and Name */}
        <div style={{ textAlign: 'center' }}>
          <Avatar 
            size={80} 
            src={user.photoURL} 
            icon={<UserOutlined />}
            style={{ marginBottom: 10 }}
          />
          <Title level={4} style={{ margin: 0 }}>
            {user.displayName || 'Anonymous User'}
          </Title>
        </div>

        {/* User Details */}
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item 
            label={
              <Space>
                <MailOutlined />
                <span>Email</span>
              </Space>
            }
          >
            {user.email}
          </Descriptions.Item>
          
          <Descriptions.Item label="User ID">
            <Text code copyable style={{ fontSize: '12px' }}>
              {user.uid}
            </Text>
          </Descriptions.Item>
          
          <Descriptions.Item label="Email Verified">
            {user.emailVerified ? (
              <Tag icon={<CheckCircleOutlined />} color="success">
                Verified
              </Tag>
            ) : (
              <Tag icon={<CloseCircleOutlined />} color="warning">
                Not Verified
              </Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Space>
    </Card>
  );
}

export default UserProfile;
