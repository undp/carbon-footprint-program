import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";
import { useCallback } from "react";

interface Props {
  open: boolean;
  handleClose: () => void;
  comment: string;
  setComment: (value: string) => void;
  onSave?: () => void;
}

export const CommentDialog = ({
  open,
  handleClose,
  comment,
  setComment,
  onSave,
}: Props) => {
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave();
    } else {
      handleClose();
    }
  }, [onSave, handleClose]);

  return (
    <Dialog onClose={handleClose} open={open}>
      <DialogTitle>Agrega un comentario</DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TextField
          sx={{
            width: 480,
            maxHeight: 208,
          }}
          autoFocus
          margin="dense"
          id="comment"
          label="Agrega un comentario, fuente de factor propio o una ayuda memoria"
          type="text"
          fullWidth
          multiline
          minRows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button color="primary" variant="contained" onClick={handleSave}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
