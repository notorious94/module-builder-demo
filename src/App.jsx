import React from 'react';
import { Table, Typography, Button, Space, message, Popconfirm, Tag, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ClearOutlined } from '@ant-design/icons';
import { apiService } from './services/api';
import AddModule from './components/AddModule';

const { Title } = Typography;

function App() {
  const [currentView, setCurrentView] = React.useState('table');
  const [modules, setModules] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [editingModule, setEditingModule] = React.useState(null);
  const [viewMode, setViewMode] = React.useState('edit'); // 'edit' or 'view'

  // Load modules on component mount
  React.useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    setLoading(true);
    try {
      const data = await apiService.getModules();
      setModules(data);
    } catch (error) {
      message.error('Failed to load modules');
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (id) => {
    try {
      await apiService.deleteModule(id);
      message.success('Module deleted successfully');
      loadModules();
    } catch (error) {
      message.error('Failed to delete module');
      console.error('Error deleting module:', error);
    }
  };

  const handleEditModule = (module) => {
    setEditingModule(module);
    setViewMode('edit');
    setCurrentView('builder');
  };

  const handleViewModule = (module) => {
    setEditingModule(module);
    setViewMode('view');
    setCurrentView('builder');
  };

  // New function to clean up duplicate modules
  const handleCleanupDuplicates = async () => {
    Modal.confirm({
      title: 'Clean Up Duplicate Modules',
      content: 'This will remove duplicate modules with the same name, keeping only the most recent one. This action cannot be undone.',
      okText: 'Clean Up',
      cancelText: 'Cancel',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setLoading(true);
          
          // Group modules by name
          const moduleGroups = {};
          modules.forEach(module => {
            const name = module.name || 'Unnamed';
            if (!moduleGroups[name]) {
              moduleGroups[name] = [];
            }
            moduleGroups[name].push(module);
          });

          let deletedCount = 0;
          
          // For each group with duplicates, keep the most recent and delete others
          for (const [name, group] of Object.entries(moduleGroups)) {
            if (group.length > 1) {
              // Sort by updatedAt date (most recent first)
              const sorted = group.sort((a, b) => 
                new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
              );
              
              // Keep the first (most recent), delete the rest
              const toDelete = sorted.slice(1);
              
              for (const module of toDelete) {
                try {
                  await apiService.deleteModule(module.id);
                  deletedCount++;
                } catch (error) {
                  console.error(`Failed to delete module ${module.id}:`, error);
                }
              }
            }
          }
          
          message.success(`Cleanup completed! Removed ${deletedCount} duplicate modules.`);
          loadModules(); // Refresh the list
          
        } catch (error) {
          message.error('Failed to cleanup duplicates');
          console.error('Cleanup error:', error);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'published':
        return 'green';
      case 'draft':
        return 'orange';
      case 'inactive':
        return 'red';
      default:
        return 'default';
    }
  };

  // Check if there are duplicates
  const hasDuplicates = () => {
    const names = modules.map(m => m.name);
    return names.length !== new Set(names).size;
  };

  const columns = [
    {
      title: 'Module Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase() || 'UNKNOWN'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewModule(record)}
            title="View Survey"
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditModule(record)}
            title="Edit Survey"
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Module"
            description="Are you sure you want to delete this module? This action cannot be undone."
            onConfirm={() => handleDeleteModule(record.id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              title="Delete Survey"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleAddModule = () => {
    setEditingModule(null);
    setViewMode('edit');
    setCurrentView('builder');
  };

  const handleBackToTable = () => {
    setCurrentView('table');
    setEditingModule(null);
    setViewMode('edit');
    loadModules(); // Refresh the table data
  };

  const handleSave = (surveyData) => {
    message.success('Survey saved successfully!');
    // Auto-refresh the table to show updated data
    setTimeout(() => {
      loadModules();
    }, 1000);
  };

  if (currentView === 'builder') {
    return (
      <AddModule 
        surveyData={editingModule} // Pass the full module data including ID
        apiService={apiService}
        onSave={handleSave}
        onBack={handleBackToTable}
        licenseKey={import.meta.env.VITE_SURVEY_CREATOR_LICENSE_KEY}
      />
    );
  }

  return (
    <div style={{ padding: '32px', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px' 
        }}>
          <div>
            <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
              Survey Modules
            </Title>
            <p style={{ color: '#666', margin: 0 }}>
              Manage your survey modules and questionnaires
            </p>
          </div>
          <Space>
            {hasDuplicates() && (
              <Button 
                icon={<ClearOutlined />}
                onClick={handleCleanupDuplicates}
                style={{ 
                  background: '#fff7e6', 
                  borderColor: '#ffd666',
                  color: '#d48806'
                }}
              >
                Clean Up Duplicates
              </Button>
            )}
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddModule}
              size="large"
            >
              Create New Survey
            </Button>
          </Space>
        </div>
        
        {hasDuplicates() && (
          <div style={{
            background: '#fff7e6',
            border: '1px solid #ffd666',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px',
            color: '#d48806'
          }}>
            <strong>Duplicate modules detected!</strong> Use the "Clean Up Duplicates" button to remove duplicate entries.
          </div>
        )}
        
        <Table 
          columns={columns} 
          dataSource={modules}
          loading={loading}
          rowKey="id"
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} modules`,
          }}
          bordered
          scroll={{ x: 800 }}
        />
      </div>
    </div>
  );
}

export default App;