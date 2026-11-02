import plistlib
import uuid
from typing import Dict, Any

def generate_shortcut_plist(upload_url: str) -> bytes:
    """
    Generates a native Apple Shortcut (.shortcut) binary property list.
    Configured to appear in the iOS Share Sheet and upload each selected photo/video
    directly to the specified ODrop upload_url without loss of quality.
    """
    group_uuid = str(uuid.uuid4()).upper()

    shortcut_dict: Dict[str, Any] = {
        "WFWorkflowClientVersion": "2607.1",
        "WFWorkflowClientRelease": "2.0",
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowIcon": {
            "WFWorkflowIconGlyphNumber": 59698, # Document / Share icon
            "WFWorkflowIconStartColor": 4282601983 # Modern Blue
        },
        "WFWorkflowTypes": ["ActionExtension"], # Enables appearance in Share Sheet (Paylaşma Sayfası)
        "WFWorkflowInputContentItemClasses": [
            "WFImageContentItem",
            "WFAVAssetContentItem",
            "WFGenericFileContentItem",
            "WFPDFContentItem",
            "WFURLContentItem"
        ],
        "WFWorkflowActions": [
            # 1. Repeat with each item in shortcut input
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.repeat.each",
                "WFWorkflowActionParameters": {
                    "GroupingIdentifier": group_uuid,
                    "WFControlFlowMode": 0
                }
            },
            # 2. Get Contents of URL (POST to ODrop server)
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.downloadurl",
                "WFWorkflowActionParameters": {
                    "WFURL": upload_url,
                    "WFHTTPMethod": "POST",
                    "WFHTTPBodyType": "Form",
                    "WFFormValues": {
                        "Value": {
                            "WFDictionaryFieldValueItems": [
                                {
                                    "WFItemType": 7, # File attachment
                                    "WFKey": {
                                        "Value": {"string": "file"},
                                        "WFSerializationType": "WFTextTokenString"
                                    },
                                    "WFValue": {
                                        "Value": {
                                            "Type": "ActionOutput",
                                            "OutputName": "Repeat Item"
                                        },
                                        "WFSerializationType": "WFTextTokenAttachment"
                                    }
                                }
                            ]
                        },
                        "WFSerializationType": "WFDictionaryFieldValue"
                    }
                }
            },
            # 3. End Repeat
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.repeat.each",
                "WFWorkflowActionParameters": {
                    "GroupingIdentifier": group_uuid,
                    "WFControlFlowMode": 2
                }
            },
            # 4. Success Notification / Haptic
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.vibrate",
                "WFWorkflowActionParameters": {}
            },
            {
                "WFWorkflowActionIdentifier": "is.workflow.actions.notification",
                "WFWorkflowActionParameters": {
                    "WFNotificationActionTitle": "ODrop",
                    "WFNotificationActionBody": "Seçilen tüm dosyalar bilgisayara kayıpsız aktarıldı! 🎉"
                }
            }
        ]
    }

    return plistlib.dumps(shortcut_dict, fmt=plistlib.FMT_BINARY)
