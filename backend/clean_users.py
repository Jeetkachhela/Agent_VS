from app.db.session import SessionLocal
from app.models import User, SurveySubmission, AgentLocation, Notification

def main():
    db = SessionLocal()
    users = db.query(User).all()

    keep_ids = set()
    kept_kanan = False
    kept_test = False

    print("--- EVALUATING USERS ---")
    for u in users:
        email = u.email.lower()
        
        # Keep all gmail
        if "@gmail.com" in email:
            print(f"KEEPING (gmail): {email}")
            keep_ids.add(u.id)
            continue
            
        # Keep one kanan
        if "kanan" in email and not kept_kanan:
            print(f"KEEPING (first kanan): {email}")
            keep_ids.add(u.id)
            kept_kanan = True
            continue
            
        # Keep one test
        if "test" in email and not kept_test:
            print(f"KEEPING (first test): {email}")
            keep_ids.add(u.id)
            kept_test = True
            continue

        print(f"WILL DELETE: {email}")

    users_to_delete = [u for u in users if u.id not in keep_ids]
    
    print("\n--- DELETING ---")
    for u in users_to_delete:
        print(f"Deleting {u.email}...")
        # Clean up related records to avoid FK constraint violations
        db.query(SurveySubmission).filter(SurveySubmission.agent_id == u.id).delete()
        db.query(AgentLocation).filter(AgentLocation.agent_id == u.id).delete()
        db.query(Notification).filter(Notification.user_id == u.id).delete()
        db.delete(u)

    db.commit()
    print(f"\nSuccessfully kept {len(keep_ids)} users and deleted {len(users_to_delete)} users.")

if __name__ == '__main__':
    main()
