import Papa from 'papaparse';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FeedbackItem } from '../types';

interface CsvRow {
  ResponseID: string;
  NPS_Score: string;
  Overall_Satisfaction: string;
  Agent_Mode_Rating: string;
  Code_Completion_Rating: string;
  Chat_Edit_Rating: string;
  Next_Edit_Suggestions_Rating: string;
  Model_Choice_Rating: string;
  Enterprise_Features_Rating: string;
  Performance_Rating: string;
  Ease_of_Use_Rating: string;
  What_Dont_You_Like: string;
  What_Would_You_Like_Added: string;
  General_Comments: string;
  User_Type: string;
  Experience_Level: string;
  Company_Size: string;
  Primary_Language: string;
}

export async function fetchCsvFeedback(): Promise<FeedbackItem[]> {
  const csvPath = join(process.cwd(), '..', 'vscode_ai_feedback.csv');
  const csvContent = readFileSync(csvPath, 'utf-8');

  const { data } = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  return data.map((row) => {
    const textParts = [
      row.What_Dont_You_Like,
      row.What_Would_You_Like_Added,
      row.General_Comments,
    ].filter(Boolean);

    return {
      id: `csv-survey:${row.ResponseID}`,
      source: 'csv-survey' as const,
      text: textParts.join(' | '),
      npsScore: parseInt(row.NPS_Score, 10) || undefined,
      ratings: {
        overallSatisfaction: parseInt(row.Overall_Satisfaction, 10),
        agentMode: parseInt(row.Agent_Mode_Rating, 10),
        codeCompletion: parseInt(row.Code_Completion_Rating, 10),
        chatEdit: parseInt(row.Chat_Edit_Rating, 10),
        nextEditSuggestions: parseInt(row.Next_Edit_Suggestions_Rating, 10),
        modelChoice: parseInt(row.Model_Choice_Rating, 10),
        enterpriseFeatures: parseInt(row.Enterprise_Features_Rating, 10),
        performance: parseInt(row.Performance_Rating, 10),
        easeOfUse: parseInt(row.Ease_of_Use_Rating, 10),
      },
      // Will be set by classifier
      themes: [],
      sentiment: 'neutral' as const,
      isFeatureRequest: false,
    };
  });
}
