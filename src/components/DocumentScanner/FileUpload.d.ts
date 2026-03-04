import React from 'react';
interface FileUploadProps {
    onFileSelected: (file: File) => void;
    disabled?: boolean;
}
declare const FileUpload: React.FC<FileUploadProps>;
export default FileUpload;
