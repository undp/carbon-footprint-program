import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";

interface Props {
  open: boolean;
  handleClose: () => void;
  comment: string;
  setComment: (value: string) => void;
  onSave: () => void;
}

export const CommentDialog = ({
  open,
  handleClose,
  comment,
  setComment,
  onSave,
}: Props) => {
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
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
