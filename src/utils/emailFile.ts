export const UNSUPPORTED_EMAIL_FILE_MESSAGE = 'Only .eml email files are supported. Choose an .eml file to continue.';

export const isEmlFile = (file: File): boolean =>
  file.name.toLowerCase().endsWith('.eml') || file.type === 'message/rfc822';
