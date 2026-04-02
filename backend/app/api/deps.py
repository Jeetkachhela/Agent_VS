from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pymongo.database import Database
from ..db.session import get_db
from ..core.security import SECRET_KEY, ALGORITHM
from ..schemas import TokenPayload, UserRole, UserOut
from bson import ObjectId

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(db: Database = Depends(get_db), token: str = Depends(oauth2_scheme)) -> UserOut:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id)
    except (JWTError, ValueError):
        raise credentials_exception
        
    try:
        user_id_obj = ObjectId(token_data.sub)
    except Exception:
        raise credentials_exception
        
    user_dict = db.users.find_one({"_id": user_id_obj})
    if user_dict is None:
        raise credentials_exception
        
    user_dict["id"] = str(user_dict.pop("_id"))
    return UserOut(**user_dict)

def get_current_active_user(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def check_role(roles: list[UserRole]):
    def role_checker(current_user: UserOut = Depends(get_current_active_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The user doesn't have enough privileges",
            )
        return current_user
    return role_checker
