import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import OpenAI, { toFile } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function downloadFile(url) {
  const headers = {};
  if (process.env.WAHA_SECRET_KEY) {
    headers['X-Api-Key'] = process.env.WAHA_SECRET_KEY;
  }
  
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers
  });
  return response.data;
}

export async function processMedia(message) {
  if (!message.hasMedia || !message.media || !message.media.url) {
    return null;
  }

  const { url, mimetype, filename } = message.media;
  
  try {
    const fileBuffer = await downloadFile(url);
    
    // Process Audio
    if (mimetype.startsWith('audio/')) {
      return await processAudio(fileBuffer, mimetype);
    }
    
    // Process Image
    if (mimetype.startsWith('image/')) {
      return await processImage(fileBuffer, mimetype);
    }
    
    // Process PDF
    if (mimetype === 'application/pdf') {
      return await processPdf(fileBuffer);
    }

    return `[Mídia não suportada recebida: ${mimetype}]`;
  } catch (error) {
    console.error('Error processing media:', error);
    return '[Erro ao processar arquivo de mídia]';
  }
}

async function processAudio(buffer, mimetype) {
  // Save buffer to temporary file because Whisper requires a file stream
  const ext = mimetype.includes('ogg') ? 'ogg' : mimetype.includes('mp4') ? 'mp4' : 'mp3';
  const tmpFilePath = path.join(os.tmpdir(), `${uuidv4()}.${ext}`);
  
  try {
    fs.writeFileSync(tmpFilePath, buffer);
    const fileStream = fs.createReadStream(tmpFilePath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
    });
    
    return `[Áudio transcrito pelo usuário]: "${transcription.text}"`;
  } finally {
    if (fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
    }
  }
}

async function processImage(buffer, mimetype) {
  const base64Image = buffer.toString('base64');
  const dataUrl = `data:${mimetype};base64,${base64Image}`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Descreva detalhadamente esta imagem. Foque em informações que possam ser relevantes para um atendimento ao cliente.' },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ],
    max_tokens: 500,
  });
  
  const description = response.choices[0].message.content;
  return `[Imagem enviada pelo usuário. Descrição da imagem]: ${description}`;
}

async function processPdf(buffer) {
  const pdfData = await pdfParse(buffer);
  const extractedText = pdfData.text;
  
  if (!extractedText || extractedText.trim().length === 0) {
    return '[PDF enviado pelo usuário, mas nenhum texto pôde ser extraído]';
  }
  
  // If the text is too long, we might want to summarize it or just truncate it
  const maxLength = 8000;
  const textToProcess = extractedText.length > maxLength 
    ? extractedText.substring(0, maxLength) + '... [texto truncado devido ao tamanho]'
    : extractedText;
    
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Você é um assistente que extrai informações relevantes de documentos PDF. Faça um resumo claro e conciso do conteúdo deste documento, destacando os pontos principais para que o agente de atendimento saiba do que se trata.'
      },
      {
        role: 'user',
        content: textToProcess
      }
    ]
  });
  
  const summary = response.choices[0].message.content;
  return `[Documento PDF enviado pelo usuário. Resumo do conteúdo]: ${summary}\n\n[Texto extraído (início)]: ${textToProcess.substring(0, 1000)}...`;
}
