"use client";

import { Modal, Button } from "@/components/ui/bootstrap";

const ModalConfirm = ({
  showConfirmModal,
  setShowConfirmModal,
  isDeleting,
  handleDeleteExit,
  selectedExit,
  title = "Confirmar Eliminación",
  message = null,
}) => {
  return (
    <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {message ||
          `¿Está seguro que desea eliminar la salida ${selectedExit?.code}?`}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={() => setShowConfirmModal(false)}
          disabled={isDeleting}
        >
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={handleDeleteExit}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <span
                className="spinner-grow spinner-grow-sm align-middle me-1"
                role="status"
                aria-hidden="true"
              ></span>
              Eliminando...
            </>
          ) : (
            "Eliminar"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalConfirm;
