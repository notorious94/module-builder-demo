import React, { useEffect, useMemo, useRef, useState } from "react";
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

// ---- Defaults (no TypeScript types) ----
const defaultCreatorOptions = {
  autoSaveEnabled: true,
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
 * Plain React JS version of SurveyCreatorWidget
 *
 * Props:
 * - json?: object                 // initial survey JSON
 * - options?: object              // Survey Creator options
 * - surveyData?: { id, surveyJson } // when editing an existing survey
 * - onSave?: Function             // optional callback after successful save
 * - onBack?: Function             // optional callback for back button navigation
 * - apiService?: { createSurvey, updateSurvey } // injected API service
 * - licenseKey?: string           // SurveyJS Creator license key (optional)
 */
export default function AddModule(props) {
  const { json, options, surveyData, onSave, onBack, apiService, licenseKey } = props;

  const [creator, setCreator] = useState(null);
  const initialJsonRef = useRef(null);
  const manualSaveRef = useRef(false);

  // Set license key once (if provided)
  useEffect(() => {
    if (licenseKey) {
      try {
        setLicenseKey(licenseKey);
      } catch (e) {
        // noop if key is invalid/undefined
        console.warn("SurveyJS license key error:", e);
      }
    }
  }, [licenseKey]);

  // Resolve initial JSON only once
  if (!initialJsonRef.current) {
    if (json) {
      initialJsonRef.current = json;
    } else if (surveyData && surveyData.surveyJson) {
      initialJsonRef.current = surveyData.surveyJson;
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
        instance.text = JSON.stringify(initialJsonRef.current || defaultJson);
      } catch (_) {
        instance.text = JSON.stringify(defaultJson);
      }

      // Define save behavior (mirrors original logic)
      instance.saveSurveyFunc = async (saveNo, callback) => {
        console.log("Save triggered with saveNo:", saveNo, "Manual save:", manualSaveRef.current);
        try {
          const surveyJson = instance.JSON;

          if (surveyData && surveyData.id && apiService?.updateSurvey) {
            // Update existing survey
            await apiService.updateSurvey(surveyData.id, { surveyJson });
          } else if (apiService?.createSurvey) {
            // Create new survey
            const surveyName = surveyJson.title || `Survey ${new Date().toLocaleDateString()}`;
            await apiService.createSurvey({
              name: surveyName,
              description: `Created on ${new Date().toLocaleDateString()}`,
              status: "draft",
              surveyJson,
            });
          }

          // Backup to localStorage
          try {
            if (typeof window !== "undefined") {
              window.localStorage.setItem("survey-json", instance.text);
            }
          } catch (_) {}

          callback(saveNo, true);
          
          // Only trigger navigation on manual save, not auto save
          if (manualSaveRef.current && typeof onSave === "function") {
            onSave();
          }
          
          // Reset the manual save flag
          manualSaveRef.current = false;
        } catch (error) {
          console.error("Failed to save survey:", error);
          try { callback(saveNo, false); } catch (_) {}
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
  }, [creator, options, onSave, apiService, surveyData]);

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
            {surveyData ? `Edit Survey: ${surveyData.name || 'Unnamed Survey'}` : 'Create New Survey'}
          </h1>
        </div>
      </div>
      
      {/* Survey Creator */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {creator ? <SurveyCreatorComponent creator={creator} /> : null}
      </div>
    </div>
  );
}