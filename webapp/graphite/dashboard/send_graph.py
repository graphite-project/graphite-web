from django.core.mail import EmailMessage
from graphite.logger import log

def send_graph_email(subject, sender, recipients, attachments=None, body=None):
    """
    :param str sender: sender's email address
    :param list recipients: list of recipient emails
    :param list attachments: list of triples of the form:
        (filename, content, mimetype). See the django docs
        https://docs.djangoproject.com/en/1.3/topics/email/#django.core.mail.EmailMessage
    """
    attachments = attachments or []
    msg = EmailMessage(subject=subject, 
		       from_email=sender, 
                       to=recipients, 
		       body=body,
                       attachments=attachments)
    msg.send()

	
