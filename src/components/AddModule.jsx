import { useEffect,  useRef, useState } from "react";
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react";
import { setLicenseKey } from "survey-core";
// CSS
import "survey-core/survey-core.css";
import "survey-creator-core/survey-creator-core.css";
import "survey-core/survey.i18n";
import "survey-creator-core/survey-creator-core.i18n";

// Enable Ace Editor in the JSON Editor tab
import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/ext-searchbox";

const defaultCreatorOptions = {
  autoSaveEnabled: true,
  autoSaveDelay: 1000,
};

const defaultJson = {
  pages: [
    {
      name: "Name",
      elements: [
        { name: "FirstName", title: "Enter your first name:", type: "text" },
        { name: "LastName", title: "Enter your last name:", type: "text" },
      ],
    },
  ],
};

/**
 * Auto-save always enabled with proper ID tracking
 */
export default function AddModule(props) {
  const { json, options, surveyData, onSave, onBack, apiService, licenseKey } = props;

  const [creator, setCreator] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [currentModuleId, setCurrentModuleId] = useState(surveyData?.id || null);
  const initialJsonRef = useRef(null);
  const manualSaveRef = useRef(false);
  const isSavingRef = useRef(false);
  const lastSavedContentRef = useRef('');

  // Set license key once (if provided)
  useEffect(() => {
    if (licenseKey) {
      try {
        setLicenseKey(licenseKey);
      } catch (e) {
        console.warn("SurveyJS license key error:", e);
      }
    }
  }, [licenseKey]);

  // Resolve initial JSON only once
  if (!initialJsonRef.current) {
    if (json) {
      initialJsonRef.current = json;
    } else if (surveyData && (surveyData.surveyJson || surveyData.form_data)) {
      initialJsonRef.current = surveyData.surveyJson || surveyData.form_data;
    } else {
      try {
        const savedJson = typeof window !== "undefined" && window.localStorage.getItem("survey-json");
        initialJsonRef.current = savedJson ? JSON.parse(savedJson) : defaultJson;
      } catch (_) {
        initialJsonRef.current = defaultJson;
      }
    }
  }

  // Create the Survey Creator instance once
  useEffect(() => {
    if (!creator) {
      const instance = new SurveyCreator(options || defaultCreatorOptions);

      // Seed the designer with initial JSON
      try {
        const initialContent = JSON.stringify(initialJsonRef.current || defaultJson);
        instance.text = initialContent;
        lastSavedContentRef.current = initialContent;
      } catch (_) {
        const defaultContent = JSON.stringify(defaultJson);
        instance.text = defaultContent;
        lastSavedContentRef.current = defaultContent;
      }

      // Save behavior with proper ID tracking
      instance.saveSurveyFunc = async (saveNo, callback) => {
        // Prevent concurrent saves
        if (isSavingRef.current) {
          console.log('Save already in progress, skipping...');
          callback(saveNo, true);
          return;
        }

        const currentContent = JSON.stringify(instance.JSON);
        
        // Skip save if content hasn't actually changed (except for manual saves)
        if (currentContent === lastSavedContentRef.current && !manualSaveRef.current) {
                callback(saveNo, true);
          return;
        }

        isSavingRef.current = true;
     
        setSaveStatus('Saving...');
        
        try {
          const surveyJson = instance.JSON;

          // Validate surveyJson
          if (!surveyJson || Object.keys(surveyJson).length === 0) {
            throw new Error('Survey data is empty');
          }

          let result;
          
          if (currentModuleId && apiService?.updateSurvey) {
    
            result = await apiService.updateSurvey(currentModuleId, { 
              surveyJson: surveyJson,
            });
            setSaveStatus('Updated successfully!');
            
          } else if (apiService?.createSurvey) {
            // CREATE new module and get ID
            const surveyName = surveyJson.title || `Survey ${new Date().toLocaleDateString()}`;
            result = await apiService.createSurvey({
              name: surveyName,
              description: `Created on ${new Date().toLocaleDateString()}`,
              status: "Active",
              surveyJson: surveyJson,
            });
            
            // CRITICAL: Store the new module ID for all future saves
            if (result && result.id) {
              setCurrentModuleId(result.id);
            }
            
            setSaveStatus('Created successfully!');
          } else {
            throw new Error('No API service available');
          }

          // Update last saved content
          lastSavedContentRef.current = currentContent;

          // Backup to localStorage
          try {
            if (typeof window !== "undefined") {
              window.localStorage.setItem("survey-json", instance.text);
            }
          } catch (e) {
            console.warn('LocalStorage save failed:', e);
          }

          callback(saveNo, true);
            
          // Clear save status after 2 seconds
          setTimeout(() => setSaveStatus(''), 2000);
          
          // Only trigger navigation callback on manual save
          if (manualSaveRef.current && typeof onSave === "function") {
            setTimeout(() => {
              onSave(result);
            }, 1000);
          }
          
          // Reset the manual save flag
          manualSaveRef.current = false;
          
        } catch (error) {
          console.error("=== SAVE FAILED ===", error);
          setSaveStatus(`Save failed: ${error.message}`);
          setTimeout(() => setSaveStatus(''), 5000);
          try { 
            callback(saveNo, false); 
          } catch (_) {}
        } finally {
          isSavingRef.current = false;
        }
      };

      // Listen for keyboard shortcuts (Ctrl+S)
      const handleKeyDown = (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault();
          manualSaveRef.current = true;
          instance.doSave();
        }
      };
      
      // Add keyboard listener
      document.addEventListener('keydown', handleKeyDown);
      
      // Store reference to cleanup function
      instance._keydownHandler = handleKeyDown;

      setCreator(instance);
    }
  }, [creator, options, onSave, apiService, currentModuleId]);

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      if (creator && creator._keydownHandler) {
        document.removeEventListener('keydown', creator._keydownHandler);
      }
    };
  }, [creator]);



  return (
    <div style={{ height: "100vh", width: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        background: "#f5f5f5",
        borderBottom: "1px solid #d9d9d9",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: "64px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button 
            style={{ 
              background: "white",
              border: "1px solid #d9d9d9",
              borderRadius: "6px",
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "14px",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s"
            }} 
            onMouseOver={(e) => e.target.style.background = "#f0f0f0"}
            onMouseOut={(e) => e.target.style.background = "white"}
            onClick={() => onBack?.()}>
            ← Back to Module List
          </button>
          <h1 style={{ 
            margin: 0, 
            fontSize: "20px", 
            fontWeight: "600", 
            color: "#262626" 
          }}>
            {currentModuleId ? `Edit Survey (ID: ${currentModuleId})` : 'Create New Survey'}
          </h1>
          
         
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {saveStatus && (
            <span style={{ 
              color: saveStatus.includes('failed') ? '#ff4d4f' : '#52c41a',
              fontSize: "14px",
              fontWeight: "500"
            }}>
              {saveStatus}
            </span>
          )}
          
         
        </div>
      </div>
      
      {/* Survey Creator */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {creator ? <SurveyCreatorComponent creator={creator} /> : (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: '#666'
          }}>
            Loading Survey Creator...
          </div>
        )}
      </div>
    </div>
  );
}