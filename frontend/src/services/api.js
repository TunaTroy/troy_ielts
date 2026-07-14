import axios from 'axios';

const API_BASE_URL = '/api';

// Speaking API
export const speakingAPI = {
  generate: async (topic) => {
    const response = await axios.post(`${API_BASE_URL}/speaking/generate`, { topic });
    return response.data;
  }
};

// Writing API
export const writingAPI = {
  generate: async (task, question) => {
    const response = await axios.post(`${API_BASE_URL}/writing/generate`, { 
      task, 
      question 
    });
    return response.data;
  },
  assess: async (task, question, essay) => {
    const response = await axios.post(`${API_BASE_URL}/writing/assess`, { 
      task, 
      question, 
      essay 
    });
    return response.data;
  }
};

// Reading API
export const readingAPI = {
  generate: async (passage, questions) => {
    const response = await axios.post(`${API_BASE_URL}/reading/generate`, { 
      passage, 
      questions 
    });
    return response.data;
  }
};

// Listening API
export const listeningAPI = {
  generate: async (transcript, questions) => {
    const response = await axios.post(`${API_BASE_URL}/listening/generate`, { 
      transcript, 
      questions 
    });
    return response.data;
  }
};

// History API
export const historyAPI = {
  getHistory: async (skill = 'all') => {
    const response = await axios.get(`${API_BASE_URL}/history`, { 
      params: { skill } 
    });
    return response.data;
  },

  addToHistory: async (skill, topic, content, result) => {
    const response = await axios.post(`${API_BASE_URL}/history`, { 
      skill, 
      topic, 
      content, 
      result 
    });
    return response.data;
  },

  toggleBookmark: async (id) => {
    const response = await axios.patch(`${API_BASE_URL}/history/${id}/bookmark`);
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/history/${id}`);
    return response.data;
  },

  clearHistory: async () => {
    const response = await axios.delete(`${API_BASE_URL}/history`);
    return response.data;
  }
};
