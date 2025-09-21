const API_BASE_URL = 'http://localhost:4000';


// Helper function to handle API responses with detailed error info
const handleResponse = async (response, context = '') => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorText = await response.text();
      errorMessage += `: ${errorText}`;
    } catch (e) {
      errorMessage += ': Unknown error';
    }
    console.error(`API Error in ${context}:`, errorMessage);
    throw new Error(errorMessage);
  }
  return response.json();
};

// Helper function to check if json-server is running
const checkServerHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/modules?_limit=1`);
    return response.ok;
  } catch (error) {
    console.error('Server health check failed:', error);
    return false;
  }
};

export const apiService = {
  // Get all modules
  async getModules() {
    try {
      console.log('Fetching modules from:', `${API_BASE_URL}/modules`);
      
      // Check server health first
      const isServerHealthy = await checkServerHealth();
      if (!isServerHealthy) {
        throw new Error('json-server is not running. Please start it with: json-server --watch db.json --port 3001');
      }

      const response = await fetch(`${API_BASE_URL}/modules`);
      const result = await handleResponse(response, 'getModules');
      console.log('Modules fetched successfully:', result.length, 'modules');
      return result;
    } catch (error) {
      console.error('Error fetching modules:', error);
      throw new Error(`Failed to fetch modules: ${error.message}`);
    }
  },

  // Create a new module
  async createModule(moduleData) {
    try {
      console.log('Creating module with data:', moduleData);
      
      const payload = {
        name: moduleData.name || 'Untitled Survey',
        description: moduleData.description || 'No description provided',
        status: moduleData.status || 'Active',
        surveyJson: moduleData.surveyJson || moduleData.form_data || {
          pages: [
            {
              name: "page1",
              elements: [
                {
                  type: "text",
                  name: "sample_question",
                  title: "Sample Question"
                }
              ]
            }
          ]
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log('Sending payload:', payload);

      const response = await fetch(`${API_BASE_URL}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const result = await handleResponse(response, 'createModule');
      console.log('Module created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating module:', error);
      throw new Error(`Failed to create module: ${error.message}`);
    }
  },

  // Update an existing module - FIXED VERSION
  async updateModule(id, moduleData) {
    try {
      console.log('Updating module:', id, 'with data:', moduleData);
      
      // First, check if the module exists
      let existingModule;
      try {
        existingModule = await this.getModule(id);
        console.log('Existing module found:', existingModule);
      } catch (error) {
        console.error('Module not found, creating new one instead');
        // If module doesn't exist, create it instead
        return this.createModule({
          ...moduleData,
          name: moduleData.name || `Survey ${id}`,
        });
      }

      // Prepare the update payload
      const updatePayload = {
        ...existingModule,
        ...moduleData,
        updatedAt: new Date().toISOString(),
      };

      // Handle different data formats (surveyJson vs form_data)
      if (moduleData.form_data && !moduleData.surveyJson) {
        updatePayload.surveyJson = moduleData.form_data;
      }
      if (moduleData.surveyJson && !moduleData.form_data) {
        updatePayload.form_data = moduleData.surveyJson;
      }

      console.log('Sending update payload:', updatePayload);

      const response = await fetch(`${API_BASE_URL}/modules/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });
      
      const result = await handleResponse(response, 'updateModule');
      console.log('Module updated successfully:', result);
      return result;
    } catch (error) {
      console.error('Error updating module:', error);
      throw new Error(`Failed to update module: ${error.message}`);
    }
  },

  // Delete a module
  async deleteModule(id) {
    try {
      console.log('Deleting module:', id);
      
      const response = await fetch(`${API_BASE_URL}/modules/${id}`, {
        method: 'DELETE',
      });
      
      if (response.status === 404) {
        throw new Error('Module not found');
      }
      
      const result = await handleResponse(response, 'deleteModule');
      console.log('Module deleted successfully');
      return result;
    } catch (error) {
      console.error('Error deleting module:', error);
      throw new Error(`Failed to delete module: ${error.message}`);
    }
  },

  // Get a single module by ID
  async getModule(id) {
    try {
      console.log('Fetching module:', id);
      
      const response = await fetch(`${API_BASE_URL}/modules/${id}`);
      
      if (response.status === 404) {
        throw new Error(`Module with ID ${id} not found`);
      }
      
      const result = await handleResponse(response, 'getModule');
      console.log('Module fetched successfully:', result);
      return result;
    } catch (error) {
      console.error('Error fetching module:', error);
      throw error;
    }
  },

  // Backward compatibility methods for AddModule component
  async createSurvey(surveyData) {
    console.log('createSurvey called with:', surveyData);
    return this.createModule({
      name: surveyData.name,
      description: surveyData.description,
      status: surveyData.status || 'Active',
      surveyJson: surveyData.surveyJson,
    });
  },

  async updateSurvey(id, surveyData) {
    console.log('updateSurvey called with:', id, surveyData);
    try {
      // For backward compatibility, handle both surveyJson and form_data
      const updateData = {};
      
      if (surveyData.surveyJson) {
        updateData.surveyJson = surveyData.surveyJson;
        updateData.form_data = surveyData.surveyJson; // Keep both for compatibility
      }
      
      if (surveyData.form_data) {
        updateData.form_data = surveyData.form_data;
        updateData.surveyJson = surveyData.form_data; // Keep both for compatibility
      }

      console.log('Calling updateModule with:', updateData);
      return this.updateModule(id, updateData);
    } catch (error) {
      console.error('Error in updateSurvey:', error);
      throw error;
    }
  },

  // Debug function to check API health
  async debugInfo() {
    try {
      const health = await checkServerHealth();
      const modules = health ? await this.getModules() : [];
      
      return {
        serverHealthy: health,
        moduleCount: modules.length,
        apiBaseUrl: API_BASE_URL,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        serverHealthy: false,
        error: error.message,
        apiBaseUrl: API_BASE_URL,
        timestamp: new Date().toISOString(),
      };
    }
  },
};