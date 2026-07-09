import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";

interface EmissionEditorCommentDialogProps {
  open: boolean;
  handleClose: () => void;
  comment: string;
  setComment: (value: string) => void;
  onSave: () => void;
}

export const EmissionEditorCommentDialog = ({
  open,
  handleClose,
  comment,
  setComment,
  onSave,
}: EmissionEditorCommentDialogProps) => {
  return (
    <Dialog
      onClose={handleClose}
      open={open}
      disablePortal={false}
      keepMounted={false}
      disableAutoFocus={false}
      disableEnforceFocus={false}
    >
      <DialogTitle>Información adicional</DialogTitle>
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
          label="Comentarios, detalles del factor propio o ayuda memoria"
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
        <Button color="primary" variant="contained" onClick={onSave}>
          Actualizar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
