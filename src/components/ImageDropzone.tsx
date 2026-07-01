import { useCallback, useEffect, useState } from 'react';

interface ImageDropzoneProps {
  file: File | null;
  onChange: (file: File | null) => void;
  label?: string;
  compact?: boolean;
}

export function ImageDropzone({
  file,
  onChange,
  label = 'Image du produit',
  compact = false,
}: ImageDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = useCallback(
    (selected: File | null) => {
      if (!selected) {
        onChange(null);
        return;
      }
      if (!selected.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image.');
        return;
      }
      onChange(selected);
    },
    [onChange],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0] ?? null);
  };

  return (
    <div className={`field ${compact ? 'field--compact' : ''}`}>
      {label && <label>{label}</label>}
      <div
        className={`dropzone ${compact ? 'dropzone--compact' : ''} ${dragOver ? 'dropzone--active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {preview ? (
          <div className="dropzone__preview">
            <img src={preview} alt="Aperçu" />
            <button type="button" className="btn btn--ghost btn--small" onClick={() => handleFile(null)}>
              Supprimer
            </button>
          </div>
        ) : (
          <>
            <p>{compact ? 'Glisser une image' : 'Glissez-déposez une image ici'}</p>
            {!compact && <p className="muted">ou</p>}
            <label className="btn btn--secondary btn--small">
              Parcourir
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </>
        )}
      </div>
      {file && !compact && <span className="file-name">{file.name}</span>}
    </div>
  );
}
