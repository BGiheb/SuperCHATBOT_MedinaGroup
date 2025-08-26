# scripts/migrate_slugs.py
from db import SessionLocal
from models import Chatbot
import uuid

def sanitize_slug(s):
    """ Nettoie les slugs pour s'assurer qu'ils sont UTF-8 """
    if not s:
        return None
    try:
        return s.encode('utf-8', errors='replace').decode('utf-8')
    except Exception:
        return None

def migrate_slugs():
    db = SessionLocal()
    updated_count = 0
    try:
        chatbots = db.query(Chatbot).all()
        for bot in chatbots:
            bot.slug = sanitize_slug(bot.slug)
            if not bot.slug:
                bot.slug = str(uuid.uuid4())
                updated_count += 1
                db.commit()
                print(f"Updated chatbot {bot.id} with new slug {bot.slug}")

        print(f"Migration completed successfully. Total slugs updated: {updated_count}")
    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_slugs()
