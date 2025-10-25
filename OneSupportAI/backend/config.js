// Configuration file for environment variables
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Environment variable configuration
const config = {
  // Build Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret',
  
  // AWS Configuration
  AWS_REGION: process.env.AWS_REGION || 'ap-southeast-2',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN || '',
  
  // Amazon Connect Configuration
  CONNECT_INSTANCE_ID: process.env.CONNECT_INSTANCE_ID,
  
  // DynamoDB Table Names
  USERS_TABLE: process.env.USERS_TABLE || 'dev-onesupportai-users',
  PRODUCTS_TABLE: process.env.PRODUCTS_TABLE || 'dev-onesupportai-products',
  CASES_TABLE: process.env.CASES_TABLE || 'dev-onesupportai-cases',
  CASE_ANALYSIS_TABLE: process.env.CASE_ANALYSIS_TABLE || 'dev-onesupportai-case-analysis',
  WEBSOCKET_CONNECTIONS_TABLE: process.env.WEBSOCKET_CONNECTIONS_TABLE || 'dev-onesupportai-websocket-connections',
  
  // RAG System Configuration
  S3_BUCKET: process.env.S3_BUCKET || 'customer-service-docs',
  MANIFEST_KEY: process.env.MANIFEST_KEY || 'index/manifest.json',
  MODEL_ID_EMBED: process.env.MODEL_ID_EMBED || 'amazon.titan-embed-text-v2:0',
  MODEL_ID_CLAUDE: process.env.MODEL_ID_CLAUDE || 'anthropic.claude-3-haiku-20240307-v1:0',
  // Bedrock Knowledge Base (KB) Configuration
  USE_BEDROCK_KB: (process.env.USE_BEDROCK_KB || 'false').toLowerCase() === 'true',
  KNOWLEDGE_BASE_ID: process.env.KNOWLEDGE_BASE_ID || '',
  KB_TOP_K: parseInt(process.env.KB_TOP_K) || 8,
  KB_STRICT_ANSWER: (process.env.KB_STRICT_ANSWER || 'true').toLowerCase() === 'true',
  KB_TEMPERATURE: process.env.KB_TEMPERATURE !== undefined ? parseFloat(process.env.KB_TEMPERATURE) : 0.1,
  KB_MAX_TOKENS: process.env.KB_MAX_TOKENS !== undefined ? parseInt(process.env.KB_MAX_TOKENS) : 800,
  KB_DATA_SOURCE_ID: process.env.KB_DATA_SOURCE_ID || '',
  // Optional: explicitly set the model ARN used by KB RetrieveAndGenerate
  // If not provided, we will derive it from region + MODEL_ID_CLAUDE
  KB_MODEL_ARN: process.env.KB_MODEL_ARN || '',
  TOP_K: parseInt(process.env.TOP_K) || 5,
  SIMILARITY_THRESHOLD: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.4,
  // PDF processing settings
  CHUNK_SIZE: parseInt(process.env.CHUNK_SIZE) || 1000,
  CHUNK_OVERLAP: parseInt(process.env.CHUNK_OVERLAP) || 200,
  MIN_CHUNK_LEN: parseInt(process.env.MIN_CHUNK_LEN) || 80,
  MAX_CONTEXT_LENGTH: parseInt(process.env.MAX_CONTEXT_LENGTH) || 6000,
  TOP_SOURCES: parseInt(process.env.TOP_SOURCES) || 5,
  MAX_DOCS_TO_FILTER: parseInt(process.env.MAX_DOCS_TO_FILTER) || 8,
  SOFT_TIMEOUT_MS: parseInt(process.env.SOFT_TIMEOUT_MS) || 20000,
  
  // CORS Configuration
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5000']
};

// Validation function (only run when explicitly called)
export const validateConfig = () => {
  const required = ['JWT_SECRET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing required environment variables: ${missing.join(', ')}`);
    console.warn('Please check your .env file or environment configuration');
    return false;
  }
  
  console.log('✅ All required environment variables are set');
  return true;
};

// Performance optimization settings
export const MAX_DOCUMENTS_PER_QUERY = 20; // Maximum documents to search per query
export const MAX_CHUNKS_PER_DOCUMENT = 100; // Maximum chunks to load per document
export const DOCUMENT_FILTER_THRESHOLD = 0.3; // Threshold for document filtering
export const CHUNK_SIMILARITY_THRESHOLD = 0.2; // Lowered threshold for better recall
export const TOP_K_CHUNKS = 10; // Reduced from default for faster processing

// Export the config object
export default config;
