import os
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
)


def upload_file(file):
    """Upload a file to Cloudinary and return the URL and public_id."""
    result = cloudinary.uploader.upload(
        file,
        folder="hr_dataroom/resumes",
        resource_type="raw",
    )
    return {
        "url": result["secure_url"],
        "public_id": result["public_id"],
    }


def delete_file(public_id):
    """Delete a file from Cloudinary by its public_id."""
    cloudinary.uploader.destroy(public_id, resource_type="raw")
