import { ImageDropzone } from './ImageDropzone';

interface MultiImageDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
  compact?: boolean;
}

export function MultiImageDropzone({
  files,
  onChange,
  label = 'Images du plan',
  compact = false,
}: MultiImageDropzoneProps) {
  const handleFileChange = (file: File | null, index: number) => {
    if (file) {
      const newFiles = [...files];
      newFiles[index] = file;
      onChange(newFiles);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const addFileSlot = () => {
    onChange([...files, new File([], '')]);
  };

  return (
    <div className={`field ${compact ? 'field--compact' : ''}`}>
      {label && <label>{label}</label>}
      <div className="multi-image-grid">
        {files.map((file, index) => (
          <div key={index} className="multi-image-item">
            <ImageDropzone
              compact
              file={file.size > 0 ? file : null}
              onChange={(newFile) => handleFileChange(newFile, index)}
              label=""
            />
            <button type="button" className="btn btn--ghost btn--small" onClick={() => removeFile(index)}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn--secondary btn--small" onClick={addFileSlot}>
        Ajouter
      </button>
    </div>
  );
}

