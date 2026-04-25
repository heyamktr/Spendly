from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate
from app.schemas.receipt import ReceiptScanRequest, ReceiptScanResponse
from app.services import expense_service, receipt_service, user_service

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


@router.get("", response_model=list[ExpenseResponse])
def list_expenses(
    user_id: Annotated[int, Query(gt=0)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    db: Session = Depends(get_db),
) -> list[ExpenseResponse]:
    user = user_service.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")

    return expense_service.list_expenses(db, user_id=user_id, limit=limit, offset=offset)


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_in: ExpenseCreate,
    db: Session = Depends(get_db),
) -> ExpenseResponse:
    user = user_service.get_user_by_id(db, expense_in.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")

    return expense_service.create_expense(db, user=user, expense_in=expense_in)


@router.post("/scan-receipt", response_model=ReceiptScanResponse)
def scan_receipt(
    receipt_in: ReceiptScanRequest,
    db: Session = Depends(get_db),
) -> ReceiptScanResponse:
    user = user_service.get_user_by_id(db, receipt_in.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")

    return receipt_service.scan_receipt(
        db,
        user=user,
        file_name=receipt_in.file_name,
        content_type=receipt_in.content_type,
        image_base64=receipt_in.image_base64,
    )


@router.patch("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_in: ExpenseUpdate,
    db: Session = Depends(get_db),
) -> ExpenseResponse:
    expense = expense_service.get_expense_by_id(db, expense_id)
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="expense not found")

    return expense_service.update_expense(db, expense=expense, expense_in=expense_in)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
) -> None:
    expense = expense_service.get_expense_by_id(db, expense_id)
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="expense not found")

    expense_service.delete_expense(db, expense=expense)
