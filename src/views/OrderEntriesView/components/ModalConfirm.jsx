"use client";

import { Modal, Button } from "@/components/ui/bootstrap";

const ModalConfirm = ({
  showConfirmModal,
  setShowConfirmModal,
  isDeleting,
  handleDeleteEntry,
  selectedEntry,
}) => {
  return (
    <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Confirmar Eliminación</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        ¿Está seguro que desea eliminar la entrada {selectedEntry?.code}?
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
          onClick={handleDeleteEntry}
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
