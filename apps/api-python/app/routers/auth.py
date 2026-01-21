"""
Authentication routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserRole
from app.auth import verify_password, create_access_token, get_current_user
from app.schemas import LoginRequest, LoginResponse, UserResponse, RegisterRequest
from app.auth import get_password_hash
from datetime import timedelta

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password"""
    # Validate input
    if not credentials.email or not credentials.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required"
        )
    
    # Find user
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Generate token
    access_token_expires = timedelta(minutes=60 * 24 * 7)  # 7 days
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    return LoginResponse(
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value
        },
        token=access_token
    )

@router.post("/register", response_model=LoginResponse)
async def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=get_password_hash(user_data.password),
        role=UserRole.STAFF  # Default to STAFF role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate token
    access_token_expires = timedelta(minutes=60 * 24 * 7)  # 7 days
    access_token = create_access_token(
        data={"sub": new_user.id, "role": new_user.role.value},
        expires_delta=access_token_expires
    )
    
    return LoginResponse(
        user={
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "role": new_user.role.value
        },
        token=access_token
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role
    )

@router.post("/logout")
async def logout():
    """Logout (client-side token removal)"""
    return {"message": "Logged out successfully"}
