import React, { useEffect, useState } from "react";
import emailjs from "@emailjs/browser";
import { Mail, MapPin, Phone, Send } from "lucide-react";

const defaultContact = {
  intro: "Have a question about the archive or a family story to share? Send us a note.",
  email: "",
  phone: "",
  location: "",
};

export default function Contact() {
  const [contact, setContact] = useState(defaultContact);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(true);

  const apiBaseUrl = (import.meta.env.API_BASE_URL || "http://localhost:5000").replace(
    /\/+$/,
    "",
  );
  const emailJsPublicKey = import.meta.env.EMAILJS_PUBLIC_KEY;
  const emailJsServiceId = import.meta.env.EMAILJS_SERVICE_ID;
  const emailJsTemplateId = import.meta.env.EMAILJS_TEMPLATE_ID;

  useEffect(() => {
    async function loadContact() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/public/site-content`);
        if (response.ok) {
          const data = await response.json();
          setContact({ ...defaultContact, ...(data.contact || {}) });
        }
      } catch (error) {
        console.error("Error loading contact details:", error);
      } finally {
        setLoading(false);
      }
    }

    loadContact();
  }, [apiBaseUrl]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    if (!emailJsPublicKey || !emailJsServiceId || !emailJsTemplateId) {
      setStatus({ type: "error", message: "The contact form is not configured yet." });
      return;
    }

    setStatus({ type: "loading", message: "Sending your message..." });

    try {
      await emailjs.send(
        emailJsServiceId,
        emailJsTemplateId,
        {
          name: form.name,
          email: form.email,
          message: form.message,
          to_email: contact.email,
        },
        { publicKey: emailJsPublicKey },
      );
      setForm({ name: "", email: "", message: "" });
      setStatus({ type: "success", message: "Your message has been sent." });
    } catch (error) {
      console.error("Error sending contact message:", error);
      setStatus({
        type: "error",
        message: "We could not send your message. Please try again.",
      });
    }
  };

  return (
    <div className="contact-view">
      <div className="container">
        <header className="contact-header">
          <p className="eyebrow">Reach the archive</p>
          <h1 className="page-title">Contact Us</h1>
          <p className="page-subtitle">
            {loading ? "Loading contact details..." : contact.intro}
          </p>
        </header>

        <div className="contact-layout">
          <section className="contact-details" aria-label="Contact details">
            <div className="contact-detail-item">
              <Mail size={21} />
              <div>
                <span>Email</span>
                {contact.email ? (
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                ) : (
                  <p>Not provided</p>
                )}
              </div>
            </div>
            <div className="contact-detail-item">
              <Phone size={21} />
              <div>
                <span>Phone</span>
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                ) : (
                  <p>Not provided</p>
                )}
              </div>
            </div>
            <div className="contact-detail-item">
              <MapPin size={21} />
              <div>
                <span>Location</span>
                <p>{contact.location || "Not provided"}</p>
              </div>
            </div>
          </section>

          <form className="contact-form glass-card" onSubmit={handleSubmit}>
            <h2>Send a message</h2>
            <div className="form-group">
              <label className="form-label" htmlFor="contact-name">
                Name
              </label>
              <input
                id="contact-name"
                name="name"
                className="glass-input"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="contact-email">
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                className="glass-input"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="contact-message">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                className="glass-input contact-message-input"
                value={form.message}
                onChange={handleChange}
                rows={7}
                required
              />
            </div>
            {status.message && (
              <p className={`contact-status ${status.type}`}>{status.message}</p>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={status.type === "loading"}
            >
              <Send size={17} />{" "}
              {status.type === "loading" ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
