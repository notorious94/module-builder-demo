import React from 'react';
import { Table, Typography, Button, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import AddModule from './components/AddModule';
import { apiService } from './services/api';

const { Title } = Typography;

function App() {
  const [currentView, setCurrentView] = React.useState('table');
  const [modules, setModules] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [editingModule, setEditingModule] = React.useState(null);

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
    setCurrentView('add');
  };

  const columns = [
    {
      title: 'Module Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditModule(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this module?"
            onConfirm={() => handleDeleteModule(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
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
    setCurrentView('add');
  };

  const handleBackToTable = () => {
    setCurrentView('table');
    setEditingModule(null);
    loadModules(); // Refresh the table data
  };

  if (currentView === 'add') {
    return (
      <AddModule 
        onSave={handleBackToTable}
        onBack={handleBackToTable}
        apiService={apiService}
        surveyData={editingModule}
        licenseKey={import.meta.env.VITE_SURVEY_CREATOR_LICENSE_KEY}
      />
    );
  }

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={2} style={{ margin: 0 }}>Module Table</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAddModule}
        >
          Add Module
        </Button>
      </div>
      <Table 
        columns={columns} 
        dataSource={modules}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        bordered
      />
    </div>
  );
}

export default App;