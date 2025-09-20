const API_BASE_URL = 'http://localhost:4000';

export const apiService = {
  // Get all modules
  async getModules() {
    const response = await fetch(`${API_BASE_URL}/modules`);
    if (!response.ok) {
      throw new Error('Failed to fetch modules');
    }
    return response.json();
  },

  // Create a new module
  async createModule(moduleData) {
    const response = await fetch(`${API_BASE_URL}/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...moduleData,
        createdAt: new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to create module');
    }
    return response.json();
  },

  // Update an existing module
  async updateModule(id, moduleData) {
    const response = await fetch(`${API_BASE_URL}/modules/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...moduleData,
        updatedAt: new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to update module');
    }
    return response.json();
  },

  // Delete a module
  async deleteModule(id) {
    const response = await fetch(`${API_BASE_URL}/modules/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete module');
    }
    return response.json();
  },

  // Get a single module by ID
  async getModule(id) {
    const response = await fetch(`${API_BASE_URL}/modules/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch module');
    }
    return response.json();
  },

  // Survey-specific methods for compatibility with AddModule component
  async createSurvey(surveyData) {
    return this.createModule({
      name: surveyData.name,
      description: surveyData.description,
      status: surveyData.status || 'Active',
      surveyJson: surveyData.surveyJson,
    });
  },

  async updateSurvey(id, surveyData) {
    const existingModule = await this.getModule(id);
    return this.updateModule(id, {
      ...existingModule,
      surveyJson: surveyData.surveyJson,
    });
  },
};