import ldap3
from ldap3 import Server, Connection, ALL, SUBTREE
from typing import Optional, Dict, Any

def authenticate_ldap(config: Any, username_or_email: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Authenticates a user against LDAP and returns user info if successful.
    Supports login via either email or user ID attribute.
    """
    if not config.is_enabled:
        return None

    try:
        print(f"DEBUG: Attempting LDAP Auth for: {username_or_email} at {config.server_uri}")
        server = Server(config.server_uri, get_info=ALL)
        
        # Connect using Bind DN if provided
        conn = Connection(
            server, 
            user=config.bind_dn, 
            password=config.bind_password, 
            auto_bind=True
        )
        
        # Search for the user by email OR user ID attribute
        search_filter = f"(|({config.user_email_attribute}={username_or_email})({config.user_id_attribute}={username_or_email}))"
        
        search_base = config.user_search_base or config.base_dn
        print(f"DEBUG: Searching LDAP with filter: {search_filter} in {search_base}")
        
        conn.search(
            search_base=search_base,
            search_filter=search_filter,
            search_scope=SUBTREE,
            attributes=[
                config.user_id_attribute, 
                config.user_email_attribute, 
                config.user_name_attribute
            ]
        )
        
        if not conn.entries:
            print(f"DEBUG: User not found in LDAP: {username_or_email}")
            return None
        
        user_entry = conn.entries[0]
        user_dn = user_entry.entry_dn
        print(f"DEBUG: Found LDAP User DN: {user_dn}")
        
        # Verify the user's password by binding as the user
        user_conn = Connection(server, user=user_dn, password=password)
        if not user_conn.bind():
            print(f"DEBUG: LDAP Bind failed for user: {user_dn}")
            return None
            
        print(f"DEBUG: LDAP Auth Successful for: {username_or_email}")
        
        # Safely extract attributes
        email = str(user_entry[config.user_email_attribute]) if config.user_email_attribute in user_entry else username_or_email
        full_name = str(user_entry[config.user_name_attribute]) if config.user_name_attribute in user_entry else username_or_email
        ldap_id = str(user_entry[config.user_id_attribute]) if config.user_id_attribute in user_entry else username_or_email

        return {
            "email": email,
            "full_name": full_name,
            "ldap_id": ldap_id
        }
        
    except Exception as e:
        print(f"CRITICAL: LDAP Authentication Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
