package com.vitaltacc.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "configuracion_negocio")
public class ConfiguracionNegocio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nombreNegocio = "VitalTacc";

    @Column(length = 255)
    private String direccion;

    @Column(length = 30)
    private String telefono;

    @Column(length = 120)
    private String email;

    @Column(length = 1000)
    private String horarioLunes;

    @Column(length = 1000)
    private String horarioMartes;

    @Column(length = 1000)
    private String horarioMiercoles;

    @Column(length = 1000)
    private String horarioJueves;

    @Column(length = 1000)
    private String horarioViernes;

    @Column(length = 1000)
    private String horarioSabado;

    @Column(length = 1000)
    private String horarioDomingo;

    @Column(length = 500)
    private String instagram;

    @Column(length = 500)
    private String whatsapp;

    @Column(length = 1000)
    private String ubicacionMaps;

    public ConfiguracionNegocio() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombreNegocio() {
        return nombreNegocio;
    }

    public void setNombreNegocio(String nombreNegocio) {
        this.nombreNegocio = nombreNegocio;
    }

    public String getDireccion() {
        return direccion;
    }

    public void setDireccion(String direccion) {
        this.direccion = direccion;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getHorarioLunes() {
        return horarioLunes;
    }

    public void setHorarioLunes(String horarioLunes) {
        this.horarioLunes = horarioLunes;
    }

    public String getHorarioMartes() {
        return horarioMartes;
    }

    public void setHorarioMartes(String horarioMartes) {
        this.horarioMartes = horarioMartes;
    }

    public String getHorarioMiercoles() {
        return horarioMiercoles;
    }

    public void setHorarioMiercoles(String horarioMiercoles) {
        this.horarioMiercoles = horarioMiercoles;
    }

    public String getHorarioJueves() {
        return horarioJueves;
    }

    public void setHorarioJueves(String horarioJueves) {
        this.horarioJueves = horarioJueves;
    }

    public String getHorarioViernes() {
        return horarioViernes;
    }

    public void setHorarioViernes(String horarioViernes) {
        this.horarioViernes = horarioViernes;
    }

    public String getHorarioSabado() {
        return horarioSabado;
    }

    public void setHorarioSabado(String horarioSabado) {
        this.horarioSabado = horarioSabado;
    }

    public String getHorarioDomingo() {
        return horarioDomingo;
    }

    public void setHorarioDomingo(String horarioDomingo) {
        this.horarioDomingo = horarioDomingo;
    }

    public String getInstagram() {
        return instagram;
    }

    public void setInstagram(String instagram) {
        this.instagram = instagram;
    }

    public String getWhatsapp() {
        return whatsapp;
    }

    public void setWhatsapp(String whatsapp) {
        this.whatsapp = whatsapp;
    }

    public String getUbicacionMaps() {
        return ubicacionMaps;
    }

    public void setUbicacionMaps(String ubicacionMaps) {
        this.ubicacionMaps = ubicacionMaps;
    }
}